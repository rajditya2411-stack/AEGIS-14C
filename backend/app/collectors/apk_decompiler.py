"""
AEGIS-14C Malware Static APK Decompiler & C2 Threat Extractor.
Deconstructs malicious Android packages (.apk), parses AndroidManifest,
extracts Command & Control (C2) domains, IP addresses, Telegram Bot tokens,
hardcoded phone numbers, and SMS-stealing permissions.
Integrates Section 63 BSA cryptographic chain-of-custody envelopes.
"""
import io
import re
import zipfile
import hashlib
from typing import Dict, List, Any, Optional
from datetime import datetime, timezone
from sqlalchemy.ext.asyncio import AsyncSession

from app.services.forensic_hasher import ForensicHasher
from app.models import Entity, Relationship
from app.normalization.engine import NormalizationEngine
import app.crud as crud


class ApkDecompiler:
    """
    Static APK Analysis Engine for Cybercrime & Banking Trojan Investigation.
    """

    TELEGRAM_BOT_TOKEN_REGEX = re.compile(r'\b(bot\d{8,12}:[A-Za-z0-9_-]{35})\b', re.IGNORECASE)
    TELEGRAM_CHAT_ID_REGEX = re.compile(r'(?:chat_id|chatId|tg_id|channel_id)\s*[:=]\s*["\']?(-?\d{7,15})["\']?', re.IGNORECASE)

    URL_REGEX = re.compile(
        r'https?://(?:[a-zA-Z0-9\-\._]+(?:\.[a-zA-Z]{2,10})|(?:\d{1,3}\.){3}\d{1,3})(?::\d{2,5})?(?:/[^\s"\'<>{}\\|^`\x00-\x1f]*)?',
        re.IGNORECASE
    )

    IPV4_REGEX = re.compile(r'\b(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\b')

    PHONE_REGEX = re.compile(r'(?:\+91[\-\s]?)?[6-9]\d{9}\b')

    DANGEROUS_PERMISSIONS = {
        "android.permission.RECEIVE_SMS": "SMS Interception / OTP Stealer",
        "android.permission.READ_SMS": "Reads Bank OTP Messages",
        "android.permission.SEND_SMS": "Unauthorized SMS Dispatch / Billing",
        "android.permission.RECEIVE_BOOT_COMPLETED": "Persistence upon device restart",
        "android.permission.BIND_ACCESSIBILITY_SERVICE": "Accessibility Keylogging / Screen Stealing",
        "android.permission.REQUEST_INSTALL_PACKAGES": "Secondary Dropper / Payload Downloader",
        "android.permission.INTERNET": "C2 Network Communication",
        "android.permission.READ_PHONE_STATE": "Harvests IMEI & SIM Serial Numbers",
        "android.permission.CALL_PHONE": "Automated Phone Dialing / USSD codes",
        "android.permission.RECORD_AUDIO": "Surveillance Eavesdropping",
        "android.permission.SYSTEM_ALERT_WINDOW": "Phishing Fake Overlay Login Screens"
    }

    BENIGN_DOMAINS = {
        "schemas.android.com", "android.com", "google.com", "googleapis.com",
        "gstatic.com", "w3.org", "apache.org", "github.com", "xmlpull.org"
    }

    @staticmethod
    def is_benign_domain(url_or_domain: str) -> bool:
        lowered = url_or_domain.lower()
        return any(b in lowered for b in ApkDecompiler.BENIGN_DOMAINS)

    @staticmethod
    def analyze_apk_bytes(apk_bytes: bytes, filename: str = "sample.apk") -> Dict[str, Any]:
        custody_envelope = ForensicHasher.hash_bytes(
            apk_bytes,
            artifact_name=filename,
            source_uri=f"FORENSIC_APK_INTAKE://{filename}"
        )

        extracted_c2_urls = set()
        extracted_ips = set()
        extracted_telegram_tokens = set()
        extracted_telegram_chats = set()
        extracted_phone_numbers = set()
        detected_permissions = []
        package_name = "unknown.malware.package"
        files_indexed = 0

        try:
            with zipfile.ZipFile(io.BytesIO(apk_bytes)) as zf:
                file_names = zf.namelist()
                files_indexed = len(file_names)

                target_files = [
                    f for f in file_names 
                    if f.endswith(('.xml', '.dex', '.json', '.txt', '.properties', '.html', '.js'))
                    or 'manifest' in f.lower() or 'classes' in f.lower()
                ]

                for target_name in target_files[:30]:
                    try:
                        raw_data = zf.read(target_name)
                        text_content = raw_data.decode('utf-8', errors='ignore')

                        for token in ApkDecompiler.TELEGRAM_BOT_TOKEN_REGEX.findall(text_content):
                            extracted_telegram_tokens.add(token)

                        for chat_id in ApkDecompiler.TELEGRAM_CHAT_ID_REGEX.findall(text_content):
                            extracted_telegram_chats.add(chat_id)

                        for url in ApkDecompiler.URL_REGEX.findall(text_content):
                            if not ApkDecompiler.is_benign_domain(url):
                                extracted_c2_urls.add(url.strip('"\'>);,'))

                        for ip in ApkDecompiler.IPV4_REGEX.findall(text_content):
                            if not ip.startswith(('127.', '10.', '192.168.', '0.', '255.')):
                                extracted_ips.add(ip)

                        for ph in ApkDecompiler.PHONE_REGEX.findall(text_content):
                            clean_ph = ph.replace("+91", "").replace("-", "").strip()
                            if len(clean_ph) == 10:
                                extracted_phone_numbers.add(clean_ph)

                        for perm, desc in ApkDecompiler.DANGEROUS_PERMISSIONS.items():
                            if perm in text_content and perm not in [p["permission"] for p in detected_permissions]:
                                detected_permissions.append({
                                    "permission": perm,
                                    "description": desc,
                                    "is_dangerous": True
                                })

                        pkg_matches = re.findall(r'\b([a-z]{2,4}\.[a-z0-9_]{3,15}\.[a-z0-9_]{3,20})\b', text_content)
                        for pm in pkg_matches:
                            if not pm.startswith(('android.', 'java.', 'javax.', 'kotlin.', 'androidx.', 'org.xml')):
                                package_name = pm
                                break

                    except Exception:
                        continue

        except Exception as e:
            return {
                "success": False,
                "error": f"Failed to decompress APK archive: {str(e)}",
                "custody_envelope": custody_envelope
            }

        risk_score = 40
        threat_tags = ["APK_FILE"]

        if any(p["permission"] == "android.permission.RECEIVE_SMS" for p in detected_permissions):
            risk_score += 25
            threat_tags.append("SMS_OTP_STEALER")

        if any(p["permission"] == "android.permission.BIND_ACCESSIBILITY_SERVICE" for p in detected_permissions):
            risk_score += 20
            threat_tags.append("ACCESSIBILITY_KEYLOGGER")

        if extracted_telegram_tokens:
            risk_score += 15
            threat_tags.append("TELEGRAM_C2_EXFILTRATION")

        if extracted_c2_urls:
            risk_score += 10
            threat_tags.append("ACTIVE_C2_BEACON")

        risk_score = min(risk_score, 100)

        malware_family = "Generic Android Trojan"
        if "SMS_OTP_STEALER" in threat_tags and "ACCESSIBILITY_KEYLOGGER" in threat_tags:
            malware_family = "Banking Trojan / Overlay Rat (Hydra / SOVA variant)"
        elif "SMS_OTP_STEALER" in threat_tags:
            malware_family = "Fake Utility / Electricity Bill SMS Forwarder"
        elif "TELEGRAM_C2_EXFILTRATION" in threat_tags:
            malware_family = "Telegram Botnet C2 Stealer"

        return {
            "success": True,
            "filename": filename,
            "package_name": package_name,
            "malware_family": malware_family,
            "threat_risk_score": risk_score,
            "threat_tags": threat_tags,
            "files_indexed": files_indexed,
            "dangerous_permissions": detected_permissions,
            "c2_urls": sorted(list(extracted_c2_urls)),
            "c2_ips": sorted(list(extracted_ips)),
            "telegram_bots": sorted(list(extracted_telegram_tokens)),
            "telegram_chats": sorted(list(extracted_telegram_chats)),
            "extracted_phones": sorted(list(extracted_phone_numbers)),
            "custody_envelope": custody_envelope
        }

    @staticmethod
    async def ingest_apk_and_seed_graph(
        db: AsyncSession,
        investigation_id: str,
        analysis_result: Dict[str, Any]
    ) -> Dict[str, Any]:
        now = datetime.now(timezone.utc)
        created_nodes = []
        created_edges = []

        custody = analysis_result.get("custody_envelope", {})
        sha256 = custody.get("sha256", "")
        pkg = analysis_result.get("package_name", "unknown.apk")

        apk_val = NormalizationEngine.normalize_value("APK_HASH", sha256)
        apk_ent = Entity(
            investigation_id=investigation_id,
            entity_type="APK_HASH",
            value=apk_val,
            raw_value=sha256,
            metadata_json={
                "filename": analysis_result.get("filename"),
                "package_name": pkg,
                "malware_family": analysis_result.get("malware_family"),
                "threat_risk_score": analysis_result.get("threat_risk_score"),
                "threat_tags": analysis_result.get("threat_tags"),
                "custody_id": custody.get("custody_id"),
                "sha256": sha256,
                "dangerous_permissions": [p["permission"] for p in analysis_result.get("dangerous_permissions", [])]
            }
        )
        db.add(apk_ent)
        await db.commit()
        await db.refresh(apk_ent)
        created_nodes.append(apk_ent)

        for url in analysis_result.get("c2_urls", []):
            clean_url = NormalizationEngine.normalize_value("PHISHING_URL", url)
            url_ent = Entity(
                investigation_id=investigation_id,
                entity_type="PHISHING_URL",
                value=clean_url,
                raw_value=url,
                metadata_json={"source": "APK_STATIC_DECOMPILER", "role": "Command & Control Server"}
            )
            db.add(url_ent)
            await db.commit()
            await db.refresh(url_ent)
            created_nodes.append(url_ent)

            rel = Relationship(
                investigation_id=investigation_id,
                source_id=apk_ent.id,
                target_id=url_ent.id,
                relation_type="communicates_with_c2",
                confidence="CONFIRMED",
                metadata_json={"protocol": "HTTPS_POST", "discovered_in_dex": True}
            )
            db.add(rel)
            created_edges.append(rel)

        for ip in analysis_result.get("c2_ips", []):
            clean_ip = NormalizationEngine.normalize_value("IP ADDRESS", ip)
            ip_ent = Entity(
                investigation_id=investigation_id,
                entity_type="IP ADDRESS",
                value=clean_ip,
                raw_value=ip,
                metadata_json={"source": "APK_STATIC_DECOMPILER", "role": "C2 Server Direct IP"}
            )
            db.add(ip_ent)
            await db.commit()
            await db.refresh(ip_ent)
            created_nodes.append(ip_ent)

            rel = Relationship(
                investigation_id=investigation_id,
                source_id=apk_ent.id,
                target_id=ip_ent.id,
                relation_type="hardcoded_c2_ip",
                confidence="CONFIRMED"
            )
            db.add(rel)
            created_edges.append(rel)

        for ph in analysis_result.get("extracted_phones", []):
            clean_ph = NormalizationEngine.normalize_value("PHONE", ph)
            ph_ent = Entity(
                investigation_id=investigation_id,
                entity_type="PHONE",
                value=clean_ph,
                raw_value=ph,
                metadata_json={"source": "APK_STATIC_DECOMPILER", "role": "Exfiltration Drop Number"}
            )
            db.add(ph_ent)
            await db.commit()
            await db.refresh(ph_ent)
            created_nodes.append(ph_ent)

            rel = Relationship(
                investigation_id=investigation_id,
                source_id=apk_ent.id,
                target_id=ph_ent.id,
                relation_type="forwards_stolen_otp_to",
                confidence="CONFIRMED"
            )
            db.add(rel)
            created_edges.append(rel)

        await db.commit()

        await crud.append_audit_ledger_entry(
            db=db,
            investigation_id=investigation_id,
            action_type="MALWARE_APK_DECOMPILED",
            actor="AEGIS-APK-DECOMPILER",
            data_payload={
                "filename": analysis_result.get("filename"),
                "sha256": sha256,
                "custody_id": custody.get("custody_id"),
                "malware_family": analysis_result.get("malware_family"),
                "c2_count": len(analysis_result.get("c2_urls", [])),
                "phones_count": len(analysis_result.get("extracted_phones", []))
            }
        )

        return {
            "apk_entity_id": apk_ent.id,
            "created_nodes_count": len(created_nodes),
            "created_edges_count": len(created_edges),
            "custody_id": custody.get("custody_id"),
            "sha256": sha256
        }
