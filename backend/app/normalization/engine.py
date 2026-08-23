import re
import ipaddress
from datetime import datetime, timezone
from typing import List, Dict, Tuple, Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.models import Entity, Relationship, Evidence
from app.collectors.base import CollectorResult, DiscoveredEntity, DiscoveredRelationship

class NormalizationEngine:
    @staticmethod
    def normalize_value(entity_type: str, raw_value: str) -> str:
        if not raw_value:
            return ""

        val = raw_value.strip()
        e_type = entity_type.upper()

        if e_type == "DOMAIN":
            # Strip protocol
            val = re.sub(r"^https?://", "", val, flags=re.IGNORECASE)
            # Strip path and port
            val = val.split("/")[0].split(":")[0]
            # Strip wildcards and trailing dots
            val = val.lstrip("*.").rstrip(".").lower()
            return val

        elif e_type == "IP ADDRESS":
            val = val.split("/")[0].split(":")[0].strip()
            try:
                ip_obj = ipaddress.ip_address(val)
                return str(ip_obj)
            except ValueError:
                return val.lower()

        elif e_type == "EMAIL":
            val = val.lower().strip()
            return val

        elif e_type == "ASN":
            val = val.upper().strip()
            if not val.startswith("AS"):
                val = f"AS{val}"
            return val

        elif e_type == "REPOSITORY":
            val = re.sub(r"^https?://", "", val, flags=re.IGNORECASE)
            val = val.rstrip("/").lower()
            if not val.startswith("github.com/"):
                val = f"github.com/{val}"
            return val

        elif e_type == "USERNAME":
            # Strip URL domain if passed as profile link
            val = re.sub(r"^https?://[^/]+/", "", val)
            val = val.split("/")[0].split("?")[0]
            val = val.lstrip("@").strip().lower()
            return val

        elif e_type in ["URL", "PHISHING_URL"]:
            val = val.strip()
            if not val.startswith("http://") and not val.startswith("https://"):
                val = f"https://{val}"
            return val

        elif e_type in ["PERSON", "ORGANIZATION"]:
            # Collapse multiple spaces
            val = re.sub(r"\s+", " ", val).strip()
            return val

        elif e_type == "TRACKING_ID":
            return val.upper().strip()

        elif e_type == "PHONE":
            # Clean phone digits
            digits = re.sub(r"\D", "", val)
            if len(digits) == 12 and digits.startswith("91"):
                digits = digits[2:]
            elif len(digits) == 11 and digits.startswith("0"):
                digits = digits[1:]
            return digits if len(digits) == 10 else val.strip()

        elif e_type in ["UPI_VPA", "MULE_ACCOUNT"]:
            val = val.lower().strip().lstrip("@")
            # Strip trailing punctuation
            val = val.rstrip(".,;:")
            return val

        elif e_type == "APK_HASH":
            return val.lower().strip()

        elif e_type == "SMS_HEADER":
            return val.upper().strip()

        elif e_type == "BANK_ACCOUNT":
            return re.sub(r"\s+", "", val).strip()

        elif e_type in ["COMPLAINT_TICKET", "LEGAL_DIRECTIVE"]:
            return val.upper().strip()

        return val.strip()


async def resolve_and_ingest_results(
    db: AsyncSession,
    investigation_id: str,
    results: List[CollectorResult]
) -> Dict[str, int]:
    """
    Normalizes, deduplicates, and resolves all collector outputs into the database graph.
    Attaches complete evidence provenance to every discovered node and edge.
    """
    now = datetime.now(timezone.utc)
    entity_id_map: Dict[Tuple[str, str], str] = {}  # (type, normalized_value) -> entity_id

    # 1. Preload existing entities for this investigation
    stmt = select(Entity).where(Entity.investigation_id == investigation_id)
    existing_entities = (await db.execute(stmt)).scalars().all()
    for ent in existing_entities:
        entity_id_map[(ent.entity_type.upper(), ent.value)] = ent.id

    new_entities_count = 0
    updated_entities_count = 0
    new_relationships_count = 0
    evidence_records_count = 0

    # 2. Ingest & Deduplicate Entities
    for result in results:
        for disc_ent in result.entities:
            norm_val = NormalizationEngine.normalize_value(disc_ent.entity_type, disc_ent.value)
            if not norm_val:
                continue

            key = (disc_ent.entity_type.upper(), norm_val)

            if key in entity_id_map:
                # Entity already exists: Update last_seen
                ent_id = entity_id_map[key]
                ent_stmt = select(Entity).where(Entity.id == ent_id)
                ent_obj = (await db.execute(ent_stmt)).scalar_one_or_none()
                if ent_obj:
                    ent_obj.last_seen = now
                    # Merge metadata
                    if disc_ent.metadata and isinstance(ent_obj.metadata_json, dict):
                        ent_obj.metadata_json.update(disc_ent.metadata)
                    updated_entities_count += 1

                # Attach Evidence
                ev = Evidence(
                    entity_id=ent_id,
                    source_name=disc_ent.source or result.collector_name,
                    raw_record=f"Discovered by {disc_ent.source}: {disc_ent.raw_value}",
                    confidence=disc_ent.confidence or "OBSERVED",
                    observed_at=now
                )
                db.add(ev)
                evidence_records_count += 1
            else:
                # Create New Entity
                new_ent = Entity(
                    investigation_id=investigation_id,
                    entity_type=disc_ent.entity_type.upper(),
                    value=norm_val,
                    raw_value=disc_ent.raw_value or disc_ent.value,
                    metadata_json=disc_ent.metadata or {},
                    first_seen=now,
                    last_seen=now
                )
                db.add(new_ent)
                await db.flush()  # Flush to generate ID
                entity_id_map[key] = new_ent.id
                new_entities_count += 1

                # Attach Evidence
                ev = Evidence(
                    entity_id=new_ent.id,
                    source_name=disc_ent.source or result.collector_name,
                    raw_record=f"Discovered by {disc_ent.source}: {disc_ent.raw_value}",
                    confidence=disc_ent.confidence or "OBSERVED",
                    observed_at=now
                )
                db.add(ev)
                evidence_records_count += 1

    await db.commit()

    # 3. Ingest & Deduplicate Relationships
    for result in results:
        for disc_rel in result.relationships:
            norm_src = NormalizationEngine.normalize_value(disc_rel.source_type, disc_rel.source_value)
            norm_tgt = NormalizationEngine.normalize_value(disc_rel.target_type, disc_rel.target_value)

            src_key = (disc_rel.source_type.upper(), norm_src)
            tgt_key = (disc_rel.target_type.upper(), norm_tgt)

            src_id = entity_id_map.get(src_key)
            tgt_id = entity_id_map.get(tgt_key)

            if src_id and tgt_id and src_id != tgt_id:
                # Check if relationship already exists
                rel_stmt = select(Relationship).where(
                    Relationship.investigation_id == investigation_id,
                    Relationship.source_id == src_id,
                    Relationship.target_id == tgt_id,
                    Relationship.relation_type == disc_rel.relation_type
                )
                existing_rel = (await db.execute(rel_stmt)).scalar_one_or_none()

                if not existing_rel:
                    new_rel = Relationship(
                        investigation_id=investigation_id,
                        source_id=src_id,
                        target_id=tgt_id,
                        relation_type=disc_rel.relation_type,
                        confidence=disc_rel.confidence or "OBSERVED",
                        metadata_json=disc_rel.metadata or {},
                        created_at=now
                    )
                    db.add(new_rel)
                    await db.flush()
                    new_relationships_count += 1

                    # Attach Evidence
                    ev = Evidence(
                        relationship_id=new_rel.id,
                        source_name=disc_rel.source or result.collector_name,
                        raw_record=f"Connected {norm_src} --({disc_rel.relation_type})--> {norm_tgt} via {disc_rel.source}",
                        confidence=disc_rel.confidence or "OBSERVED",
                        observed_at=now
                    )
                    db.add(ev)
                    evidence_records_count += 1

    await db.commit()

    return {
        "new_entities": new_entities_count,
        "updated_entities": updated_entities_count,
        "new_relationships": new_relationships_count,
        "evidence_records": evidence_records_count
    }
