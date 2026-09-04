"""
AEGIS-14C Threat Syndicate Modus Operandi (MO) Profiler.
Analyzes IOC footprints, communication channels, APK malware signatures,
and UPI transaction velocity to profile notorious cybercrime syndicates in India:
- Jamtara / Giridih (Electricity Bill APK & Banking Trojan Forwarders)
- Mewat / Deeg / Bharatpur (OLX Army Escrow & Sextortion Funnels)
- Southeast Asia Triad (Cambodia/Myanmar/Laos Part-Time Crypto & Digital Arrest)
- Chinese Unregulated Micro-Lending Apps (Aggressive Photo Morphing Extortion)
"""
from typing import Dict, List, Any, Optional
from datetime import datetime, timezone
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.models import Entity, Relationship, IncidentTicket
import app.crud as crud


class SyndicateProfiler:
    """
    Autonomous Modus Operandi Profiler & Threat Actor Attribution Engine.
    """

    SYNDICATE_SIGNATURES = {
        "JAMTARA_GIRIDIH_CELL": {
            "name": "Jamtara-Giridih Cybercrime Syndicate",
            "geographic_epicenter": "Jamtara / Giridih / Deoghar (Jharkhand / West Bengal Border)",
            "primary_mo": "Electricity Bill Disconnection / Banking KYC APK Trojans",
            "statutory_violations": ["BNS Section 318(4) (Cheating)", "BNS Section 319(2) (Impersonation)", "IT Act Section 66C & 66D"],
            "indicators": ["bijli", "electricity", "disconnection", "apk", "sbi_reward", "sms_header", "update.apk", "bill_overdue"],
            "typical_loss_range": "₹25,000 - ₹2,50,000",
            "mule_dispersion_speed": "High (Sub-15 minute cash withdrawal at rural CSP kiosks / micro-ATMs)",
            "countermeasures": [
                "Issue Section 94 BNSS Emergency Debit-Freeze to Layer 1 Mule Banks",
                "Request DoT/TRAI IMEI blacklisting for SMS blast burner phones",
                "Requisition Google Play Protect / VirusTotal malware signature block"
            ]
        },
        "MEWAT_BHARATPUR_SYNDICATE": {
            "name": "Mewat-Bharatpur Cyber Extortion Syndicate",
            "geographic_epicenter": "Nuh (Haryana) / Bharatpur / Deeg / Alwar (Rajasthan)",
            "primary_mo": "OLX Fake Army Officer Escrow & Video Call Sextortion",
            "statutory_violations": ["BNS Section 308(2) (Extortion)", "BNS Section 319(2) (Impersonation of Armed Forces)", "IT Act Section 66E (Privacy Violation) & 67A"],
            "indicators": ["army", "cisf", "crpf", "olx", "vehicle", "courier_charge", "transfer_posting", "video_call", "nude"],
            "typical_loss_range": "₹50,000 - ₹5,00,000",
            "mule_dispersion_speed": "Medium (Direct UPI P2P payments and fast P2P crypto purchases)",
            "countermeasures": [
                "Immediate Section 94 BNSS notice to Payment Aggregators (PhonePe/Paytm/GPay)",
                "Submit WhatsApp Account ban request to Meta nodal officer",
                "Order immediate freeze of receiver bank accounts in Bharatpur/Nuh branches"
            ]
        },
        "SOUTHEAST_ASIA_CRYPTO_SYNDICATE": {
            "name": "Southeast Asia Cyber Slavery Cartel (Golden Triangle)",
            "geographic_epicenter": "Sihanoukville (Cambodia) / Myawaddy (Myanmar) / Bokeo (Laos)",
            "primary_mo": "Digital Arrest (CBI/ED/TRAI Impersonation) & Part-Time Telegram Job Review",
            "statutory_violations": ["BNS Section 318(4)", "BNS Section 316(2) (Criminal Breach of Trust)", "BNS Section 204 (Impersonating Public Servant)", "IT Act Section 66D"],
            "indicators": ["cbi", "digital_arrest", "customs", "money_laundering", "fedex", "telegram", "review", "usdt", "task", "crypto", "vip_task"],
            "typical_loss_range": "₹5,00,000 - ₹25,00,000+",
            "mule_dispersion_speed": "Ultra-High (Layer 1-3 Indian mule accounts converted to USDT within 30 minutes)",
            "countermeasures": [
                "Immediate Golden-Hour 1930 NCRP portal freeze notification",
                "Section 94 BNSS notice with Sec 223 BNS warning sent to current account nodal officers",
                "Flag high-velocity Binance / WazirX / Bybit P2P merchant wallet addresses to FIU-IND"
            ]
        },
        "INSTANT_LOAN_APP_EXTORTION": {
            "name": "Chinese-Linked Predatory Loan App Syndicate",
            "geographic_epicenter": "Bangalore / Delhi-NCR Operations Centers (Offshore Servers in HK/Singapore)",
            "primary_mo": "7-Day Instant Micro-Loans, Contact List Harvesting & Morphed Photo Extortion",
            "statutory_violations": ["BNS Section 308(2) (Extortion)", "BNS Section 351(2) (Criminal Intimidation)", "IT Act Section 67", "RBI Non-Banking Financial Regulations"],
            "indicators": ["loan", "7_days", "contacts", "gallery", "morphed", "nude_contacts", "recovery_agent", "overdue"],
            "typical_loss_range": "₹15,000 - ₹1,50,000 (Recurring Extortion)",
            "mule_dispersion_speed": "High (Virtual Accounts powered by Razorpay/Cashfree gateways)",
            "countermeasures": [
                "Requisition Payment Gateway nodal officer to freeze master Virtual Account / Merchant ID",
                "Liaise with CERT-In to block hosting IP and C2 domain under Section 69A IT Act",
                "Issue advisory to complainant regarding local police protection against harassment"
            ]
        }
    }

    @staticmethod
    async def profile_investigation_syndicate(
        db: AsyncSession,
        investigation_id: str
    ) -> Dict[str, Any]:
        """
        Profiles the active investigation graph against known syndicate signatures.
        """
        stmt_ent = select(Entity).where(Entity.investigation_id == investigation_id)
        entities = list((await db.execute(stmt_ent)).scalars().all())

        ticket = await crud.get_incident_ticket_by_investigation(db, investigation_id)

        # Aggregate tokens and text
        searchable_tokens = []
        if ticket:
            searchable_tokens.extend((ticket.scam_category or "").lower().split())
            searchable_tokens.extend((ticket.summary or "").lower().split())
            if ticket.metadata_json:
                for v in ticket.metadata_json.values():
                    if isinstance(v, str):
                        searchable_tokens.extend(v.lower().split())

        for ent in entities:
            searchable_tokens.append(ent.value.lower())
            if ent.metadata_json:
                for k, v in ent.metadata_json.items():
                    if isinstance(v, str):
                        searchable_tokens.extend(v.lower().split())

        full_text = " ".join(searchable_tokens)

        # Match scores for each syndicate
        syndicate_scores = {}
        for syn_id, syn_data in SyndicateProfiler.SYNDICATE_SIGNATURES.items():
            score = 15  # Baseline
            matched_indicators = []
            for ind in syn_data["indicators"]:
                if ind in full_text:
                    score += 15
                    matched_indicators.append(ind)

            # Bonus for specific entity types
            if syn_id == "JAMTARA_GIRIDIH_CELL" and any(e.entity_type == "APK_HASH" for e in entities):
                score += 30
                matched_indicators.append("Malicious APK Decompiled")
            if syn_id == "SOUTHEAST_ASIA_CRYPTO_SYNDICATE" and any(e.entity_type == "MULE_ACCOUNT" for e in entities):
                score += 20
                matched_indicators.append("Multi-Hop Mule Accounts")

            score = min(score, 96)
            syndicate_scores[syn_id] = {
                "score": score,
                "matched_indicators": matched_indicators,
                "profile": syn_data
            }

        # Select top match
        top_syn_id = max(syndicate_scores.keys(), key=lambda k: syndicate_scores[k]["score"])
        top_match = syndicate_scores[top_syn_id]

        return {
            "investigation_id": investigation_id,
            "matched_syndicate_id": top_syn_id,
            "confidence_score": top_match["score"],
            "syndicate_name": top_match["profile"]["name"],
            "epicenter": top_match["profile"]["geographic_epicenter"],
            "primary_mo": top_match["profile"]["primary_mo"],
            "statutory_violations": top_match["profile"]["statutory_violations"],
            "matched_indicators": top_match["matched_indicators"],
            "recommended_countermeasures": top_match["profile"]["countermeasures"],
            "all_syndicate_rankings": [
                {
                    "id": k,
                    "name": v["profile"]["name"],
                    "score": v["score"]
                }
                for k, v in sorted(syndicate_scores.items(), key=lambda x: x[1]["score"], reverse=True)
            ]
        }
