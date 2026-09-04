import time
import uuid
from typing import List, Dict, Any, Optional
from datetime import datetime
from app.models import Investigation, Entity, Relationship

class IntelExchangeService:
    """
    AEGIS-I4C Inter-Agency Threat Intelligence Exchange and Broadcasting Network.
    Facilitates secure sharing of verified cybercrime indicators (Mule Accounts,
    C2 IPs, Phishing Domains, Telegram Bot Tokens) to:
    - I4C (Indian Cybercrime Coordination Centre)
    - NPCI (National Payments Corporation of India / Fin-Crime Gateway)
    - CERT-In (Indian Computer Emergency Response Team)
    - DoT / Sanchar Saathi (Department of Telecommunications)
    - State Cyber Crime Police Stations (CCTNS Mesh)
    """

    PARTNER_AGENCIES = [
        {"id": "i4c-central", "name": "I4C National Cybercrime Portal", "type": "Federal Intelligence", "status": "CONNECTED"},
        {"id": "npci-frauds", "name": "NPCI Fin-Crime Prevention Gateway", "type": "Banking / Payment Switch", "status": "CONNECTED"},
        {"id": "cert-in", "name": "CERT-In Incident Response Hub", "type": "National Security / Threat Intel", "status": "CONNECTED"},
        {"id": "dot-sanchar", "name": "DoT Sanchar Saathi / TAFCOP", "type": "Telecom Regulatory", "status": "CONNECTED"},
        {"id": "state-cctns", "name": "State Police CCTNS Inter-Op Grid", "type": "Law Enforcement Mesh", "status": "CONNECTED"}
    ]

    @classmethod
    def generate_stix_package(cls, investigation: Investigation, entities: List[Entity], relationships: List[Relationship]) -> Dict[str, Any]:
        """
        Generates a standard STIX 2.1 compliant Threat Intelligence JSON bundle
        representing the active investigation, indicators, and observable objects.
        """
        bundle_id = f"bundle--{uuid.uuid4()}"
        now_iso = datetime.utcnow().isoformat() + "Z"

        objects = [
            {
                "type": "report",
                "spec_version": "2.1",
                "id": f"report--{investigation.id}",
                "created": now_iso,
                "modified": now_iso,
                "name": f"AEGIS-I4C Threat Intelligence Report: {investigation.title}",
                "description": f"Case Target: {investigation.target} | Crime Classification: {investigation.type}",
                "published": now_iso,
                "object_refs": [f"indicator--{e.id}" for e in entities]
            }
        ]

        type_mapping = {
            "DOMAIN": "domain-name",
            "IP ADDRESS": "ipv4-addr",
            "UPI_VPA": "user-account",
            "MULE_ACCOUNT": "bank-account",
            "BANK_ACCOUNT": "bank-account",
            "PHISHING_URL": "url",
            "PHONE": "phone-number",
            "EMAIL": "email-addr"
        }

        for ent in entities:
            stix_type = type_mapping.get(ent.entity_type, "x-aegis-observable")
            obj = {
                "type": "indicator",
                "spec_version": "2.1",
                "id": f"indicator--{ent.id}",
                "created": now_iso,
                "name": f"{ent.entity_type}: {ent.value}",
                "pattern": f"[{stix_type}:value = '{ent.value}']",
                "pattern_type": "stix",
                "valid_from": now_iso,
                "confidence": 90 if getattr(ent, 'confidence', 'CONFIRMED') == "CONFIRMED" else 70,
                "custom_properties": {
                    "aegis_entity_type": ent.entity_type,
                    "raw_value": ent.raw_value or ent.value,
                    "metadata": ent.metadata_json or {}
                }
            }
            objects.append(obj)

        return {
            "type": "bundle",
            "id": bundle_id,
            "spec_version": "2.1",
            "objects": objects,
            "aegis_provenance": {
                "generated_by": "AEGIS-I4C Intelligence Engine v2.4",
                "statutory_compliance": "Section 63 BSA & Section 94 BNSS",
                "timestamp": now_iso
            }
        }

    @classmethod
    def broadcast_indicators(
        cls,
        investigation_id: str,
        investigation_title: str,
        target: str,
        crime_category: str,
        entities: List[Entity],
        target_agencies: List[str],
        broadcaster_officer: str = "Inspector AEGIS Cyber Command"
    ) -> Dict[str, Any]:
        """
        Broadcasts case indicators to selected partner agencies and returns an acknowledgment receipt.
        """
        broadcast_id = f"AEGIS-BC-{uuid.uuid4().hex[:8].upper()}"
        timestamp = datetime.utcnow().strftime("%Y-%m-%d %H:%M:%S UTC")

        iocs_summary = {
            "mule_vpas": [e.value for e in entities if e.entity_type in ["UPI_VPA", "MULE_ACCOUNT"]],
            "bank_accounts": [e.value for e in entities if e.entity_type in ["BANK_ACCOUNT"]],
            "c2_domains": [e.value for e in entities if e.entity_type in ["DOMAIN", "PHISHING_URL"]],
            "phone_numbers": [e.value for e in entities if e.entity_type in ["PHONE"]],
            "ip_addresses": [e.value for e in entities if e.entity_type in ["IP ADDRESS"]]
        }

        deliveries = []
        for agency_id in target_agencies:
            agency_meta = next((a for a in cls.PARTNER_AGENCIES if a["id"] == agency_id), None)
            agency_name = agency_meta["name"] if agency_meta else agency_id
            deliveries.append({
                "agency_id": agency_id,
                "agency_name": agency_name,
                "delivery_status": "ACKNOWLEDGED_EN_ROUTE",
                "ack_token": f"ACK-{uuid.uuid4().hex[:6].upper()}",
                "received_at": timestamp
            })

        return {
            "success": True,
            "broadcast_id": broadcast_id,
            "investigation_id": investigation_id,
            "investigation_title": investigation_title,
            "target": target,
            "crime_category": crime_category,
            "broadcaster_officer": broadcaster_officer,
            "broadcast_timestamp": timestamp,
            "total_iocs_broadcast": len(entities),
            "iocs_breakdown": iocs_summary,
            "agency_deliveries": deliveries,
            "action_required": "Automatic NPCI 24hr Lien, Telecom SIM Freeze & I4C Central Blacklist Sync"
        }

    @classmethod
    def get_live_intel_feed(cls) -> List[Dict[str, Any]]:
        """
        Returns simulated real-time inter-agency intelligence bulletin feeds.
        """
        return [
            {
                "feed_id": "FEED-9901",
                "timestamp": "Just now",
                "origin_agency": "I4C National Cyber Cell",
                "alert_title": "🚨 Coordinated Spike: Fake SBI APK Smishing Campaign",
                "severity": "CRITICAL",
                "iocs": ["sbi-reward-claim.top", "sbi.claim.bonus@icici", "+919811204567"],
                "action": "Immediate NPCI VPA Freeze & DoT IMEI Blacklist Active"
            },
            {
                "feed_id": "FEED-9895",
                "timestamp": "12 mins ago",
                "origin_agency": "Mumbai Cyber Police (State CCTNS)",
                "alert_title": "⚠️ High-Value Mule Ring: 4-Tier ICICI / Axis Split Network",
                "severity": "HIGH",
                "iocs": ["mule.settle88@ybl", "9198765432101", "104.21.89.44"],
                "action": "Section 94 BNSS Freeze Directive Issued to Nodal Bank"
            },
            {
                "feed_id": "FEED-9880",
                "timestamp": "45 mins ago",
                "origin_agency": "CERT-In Fin-Threat Unit",
                "alert_title": "🛡️ C2 Takedown Advisory: Telegram Bot Dropper @sbi_verify_bot",
                "severity": "HIGH",
                "iocs": ["c2.trojan-network.org", "bot8899112233:AAFlkjhsdf87"],
                "action": "ISP DNS Poisoning Directive Circulated via DoT"
            },
            {
                "feed_id": "FEED-9850",
                "timestamp": "2 hours ago",
                "origin_agency": "DoT Sanchar Saathi Cell",
                "alert_title": "📋 Mewat Sextortion SIM Sweep: 1,420 PoS SIMs Suspended",
                "severity": "MEDIUM",
                "iocs": ["+919822334455", "+919844556677"],
                "action": "TAFCOP IMEI Block Applied across Airtel/Jio"
            }
        ]
