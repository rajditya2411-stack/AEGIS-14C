import re
from dataclasses import dataclass, field
from typing import List, Dict, Any, Optional, Tuple


@dataclass
class ParsedComplaintResult:
    raw_text: str
    source_channel: str
    scam_category: str
    threat_severity: int  # 0 to 100
    severity_level: str   # LOW, MEDIUM, HIGH, CRITICAL
    bns_sections: List[str] = field(default_factory=list)
    it_act_sections: List[str] = field(default_factory=list)
    all_legal_sections: List[str] = field(default_factory=list)
    
    # Extracted IOC collections
    upi_vpas: List[str] = field(default_factory=list)
    phone_numbers: List[str] = field(default_factory=list)
    phishing_urls: List[str] = field(default_factory=list)
    domains: List[str] = field(default_factory=list)
    sms_headers: List[str] = field(default_factory=list)
    apk_hashes: List[str] = field(default_factory=list)
    apk_names: List[str] = field(default_factory=list)
    bank_accounts: List[str] = field(default_factory=list)
    ifsc_codes: List[str] = field(default_factory=list)
    monetary_amounts: List[str] = field(default_factory=list)
    threat_keywords: List[str] = field(default_factory=list)
    summary: str = ""

    def to_dict(self) -> Dict[str, Any]:
        return {
            "raw_text": self.raw_text,
            "source_channel": self.source_channel,
            "scam_category": self.scam_category,
            "threat_severity": self.threat_severity,
            "severity_level": self.severity_level,
            "bns_sections": self.bns_sections,
            "it_act_sections": self.it_act_sections,
            "all_legal_sections": self.all_legal_sections,
            "extracted_iocs": {
                "upi_vpas": self.upi_vpas,
                "phone_numbers": self.phone_numbers,
                "phishing_urls": self.phishing_urls,
                "domains": self.domains,
                "sms_headers": self.sms_headers,
                "apk_hashes": self.apk_hashes,
                "apk_names": self.apk_names,
                "bank_accounts": self.bank_accounts,
                "ifsc_codes": self.ifsc_codes,
                "monetary_amounts": self.monetary_amounts,
                "threat_keywords": self.threat_keywords,
            },
            "summary": self.summary
        }


class ComplaintParser:
    """
    AEGIS-I4C Unstructured Complaint Ingestion & Structured IOC Parser.
    Extracts Indian Cyber Crime Threat Indicators (UPI VPAs, Phone Numbers, 
    Phishing URLs, SMS Headers, APK Hashes) and maps statutory BNS / IT Act violations.
    """

    # Known Indian UPI handles & providers
    UPI_HANDLES = [
        "paytm", "ybl", "ibl", "axl", "apl", "okhdfcbank", "oksbi", "okaxis", "okicici",
        "icici", "sbi", "hdfcbank", "axisbank", "barodampay", "upi", "kotak", "federal",
        "airtel", "freecharge", "postbank", "jupiteraxis", "slice", "payzapp", "pingpay",
        "waaxis", "wahdfc", "wasbi", "waicici", "aubank", "indus", "idfcbank", "yesbank",
        "pnb", "canara", "unionbank", "cred", "amazonpay", "mobikwik", "timpay", "razerpay"
    ]

    # Common Indian TRAI SMS Header pattern (e.g. AD-ETHIK, VM-SBIINB, VK-HDFCBK, CP-PAYTM, BZ-POWER)
    SMS_HEADER_PATTERN = re.compile(r'\b([A-Z]{2}-?[A-Z0-9]{3,8})\b')

    # SHA-256 (64 hex characters) and MD5 (32 hex characters)
    SHA256_PATTERN = re.compile(r'\b([a-fA-F0-9]{64})\b')
    MD5_PATTERN = re.compile(r'\b([a-fA-F0-9]{32})\b')

    # Indian IFSC code pattern (4 letters + '0' + 6 alphanumeric)
    IFSC_PATTERN = re.compile(r'\b([A-Z]{4}0[A-Z0-9]{6})\b')

    # Indian Phone number patterns (+91-9876543210, 9876543210, 09876543210)
    PHONE_PATTERNS = [
        re.compile(r'(?:\+91[\s\-]?)?(?:0)?[6-9]\d{4}[\s\-]?\d{5}\b'),
        re.compile(r'(?:\+91[\s\-]?)?(?:0)?[6-9]\d{9}\b')
    ]

    # Currency and Amount patterns (Rs. 50,000 / INR 5000 / ₹25,000)
    AMOUNT_PATTERN = re.compile(r'(?:(?:Rs\.?|INR|₹)\s*[\d,]+(?:\.\d{2})?|\b\d+[\d,]*\s*(?:rupees|rs|lakh|crore)\b)', re.IGNORECASE)

    # APK files and package names
    APK_PATTERN = re.compile(r'\b([a-zA-Z0-9_\-\.]+\.apk)\b', re.IGNORECASE)

    # URLs and Phishing links
    URL_PATTERN = re.compile(r'https?://[^\s<>"\',;]+|(?:www\.)[^\s<>"\',;]+|(?:bit\.ly|tinyurl\.com|t\.me|wa\.me|ngrok\.io|cutt\.ly|is\.gd)/[^\s<>"\',;]+', re.IGNORECASE)

    # Common Scam Scenario Keywords & Weights
    SCAM_SCENARIOS = {
        "ELECTRICITY_BILL_SCAM": {
            "keywords": ["electricity", "power", "bill", "disconnect", "bijli", "line kat", "officer", "urja", "discom", "ebill", "tonight 9:30"],
            "category": "Utility / Electricity Disconnection Phishing",
            "base_score": 75,
            "bns": ["Section 318(4) BNS (Cheating & Dishonest Inducement)", "Section 319 BNS (Cheating by Personation)", "Section 351 BNS (Criminal Intimidation)"],
            "it_act": ["Section 66D IT Act (Cheating by Personation via Computer Resource)"]
        },
        "FAKE_BANK_KYC_APK": {
            "keywords": ["kyc", "pan card", "blocked", "suspend", "deactivated", "sbi", "hdfc", "icici", "pnb", "yono", "reward points", "update pan", "netbanking", "apk", "install app"],
            "category": "Banking KYC & Malicious APK Phishing",
            "base_score": 85,
            "bns": ["Section 318(4) BNS (Cheating)", "Section 319 BNS (Personation)", "Section 336 BNS (Forgery for Cheating)"],
            "it_act": ["Section 66D IT Act (Cheating by Personation)", "Section 66C IT Act (Identity Theft)", "Section 43 IT Act (Unauthorized Access / Malware)"]
        },
        "DIGITAL_ARREST_POLICE": {
            "keywords": ["digital arrest", "cbi", "police", "customs", "mha", "narcotics", "parcel", "fedex", "dhl", "illegal goods", "arrest warrant", "skype", "supreme court", "video call"],
            "category": "Digital Arrest / Law Enforcement Impersonation Extortion",
            "base_score": 95,
            "bns": ["Section 318(4) BNS (Cheating)", "Section 319 BNS (Personation of Public Servant)", "Section 351 BNS (Criminal Intimidation)", "Section 308 BNS (Extortion)"],
            "it_act": ["Section 66D IT Act (Cheating by Personation)", "Section 66C IT Act (Identity Theft)"]
        },
        "WORK_FROM_HOME_TELEGRAM": {
            "keywords": ["telegram", "youtube like", "hotel review", "task", "part time", "daily income", "earn 3000", "wfh", "work from home", "prepaid task", "crypto recharge"],
            "category": "Work-From-Home / Part-Time Task Multi-Tier Fraud",
            "base_score": 80,
            "bns": ["Section 318(4) BNS (Cheating)", "Section 316 BNS (Criminal Breach of Trust)"],
            "it_act": ["Section 66D IT Act (Cheating by Personation via Computer)"]
        },
        "UPI_REFUND_QR_FRAUD": {
            "keywords": ["olx", "qr code", "receive money", "refund", "pin enter", "scan qr", "lottery", "cashback", "scratch card", "credited"],
            "category": "UPI QR Code / Reverse Refund Fraud",
            "base_score": 70,
            "bns": ["Section 318(4) BNS (Cheating & Inducing Delivery)"],
            "it_act": ["Section 66D IT Act (Cheating by Personation)"]
        },
        "LOAN_APP_HARASSMENT": {
            "keywords": ["loan", "overdue", "contacts", "gallery", "nude", "blackmail", "repay immediately", "legal action", "instant loan", "repayment"],
            "category": "Predatory Loan App & Digital Extortion",
            "base_score": 90,
            "bns": ["Section 351 BNS (Criminal Intimidation)", "Section 308 BNS (Extortion)", "Section 318(4) BNS (Cheating)"],
            "it_act": ["Section 66E IT Act (Violation of Privacy)", "Section 66D IT Act (Cheating)"]
        }
    }

    @classmethod
    def parse_complaint(
        cls,
        raw_text: str,
        source_channel: str = "1930 Helpline",
        complainant_name: Optional[str] = None,
        complainant_contact: Optional[str] = None
    ) -> ParsedComplaintResult:
        if not raw_text or not raw_text.strip():
            return ParsedComplaintResult(
                raw_text="",
                source_channel=source_channel,
                scam_category="Unknown / Insufficient Data",
                threat_severity=0,
                severity_level="LOW",
                summary="Empty complaint payload provided."
            )

        text = raw_text.strip()

        # 1. Extract UPI VPAs
        upi_vpas = cls._extract_upi_vpas(text)

        # 2. Extract Phone Numbers
        phone_numbers = cls._extract_phone_numbers(text)

        # 3. Extract Phishing URLs & Domains
        urls, domains = cls._extract_urls_and_domains(text)

        # 4. Extract SMS Headers
        sms_headers = cls._extract_sms_headers(text)

        # 5. Extract APK Hashes & Names
        apk_hashes, apk_names = cls._extract_apk_metadata(text)

        # 6. Extract Bank Accounts & IFSC Codes
        bank_accounts, ifsc_codes = cls._extract_bank_details(text)

        # 7. Extract Monetary Amounts
        monetary_amounts = cls._extract_monetary_amounts(text)

        # 8. Threat Scenario Matching & Statutory Legal Clauses
        scenario_match, detected_keywords = cls._classify_scam(text)

        # 9. Compute Overall Threat Severity Score
        threat_severity, severity_level = cls._calculate_severity(
            scenario_match=scenario_match,
            upi_count=len(upi_vpas),
            url_count=len(urls),
            apk_count=len(apk_hashes) + len(apk_names),
            amount_count=len(monetary_amounts)
        )

        bns_sections = scenario_match["bns"]
        it_act_sections = scenario_match["it_act"]
        all_legal_sections = bns_sections + it_act_sections

        # Build human-readable summary
        summary = cls._generate_summary(
            category=scenario_match["category"],
            upi_vpas=upi_vpas,
            phones=phone_numbers,
            urls=urls,
            amounts=monetary_amounts,
            severity_level=severity_level
        )

        return ParsedComplaintResult(
            raw_text=text,
            source_channel=source_channel,
            scam_category=scenario_match["category"],
            threat_severity=threat_severity,
            severity_level=severity_level,
            bns_sections=bns_sections,
            it_act_sections=it_act_sections,
            all_legal_sections=all_legal_sections,
            upi_vpas=upi_vpas,
            phone_numbers=phone_numbers,
            phishing_urls=urls,
            domains=domains,
            sms_headers=sms_headers,
            apk_hashes=apk_hashes,
            apk_names=apk_names,
            bank_accounts=bank_accounts,
            ifsc_codes=ifsc_codes,
            monetary_amounts=monetary_amounts,
            threat_keywords=detected_keywords,
            summary=summary
        )

    @classmethod
    def _extract_upi_vpas(cls, text: str) -> List[str]:
        """
        Extract Indian UPI Virtual Payment Addresses (e.g. target@paytm, scammer@okhdfcbank, 9876543210@ybl).
        """
        vpas = set()
        
        # 1. Regex specifically targeting all major Indian PSP handles
        handle_pattern_str = r'([a-zA-Z0-9\.\-_]{2,64}@(?:' + '|'.join(cls.UPI_HANDLES) + r'))\b'
        handle_pattern = re.compile(handle_pattern_str, re.IGNORECASE)
        for match in handle_pattern.finditer(text):
            val = match.group(1).strip().lower().rstrip(".,;:")
            vpas.add(val)

        # 2. Generic UPI format: user@bank handle (avoid email false positives like @gmail.com)
        email_domains = {"gmail.com", "yahoo.com", "outlook.com", "hotmail.com", "proton.me", "icloud.com", "gov.in"}
        generic_upi_pattern = re.compile(r'\b([a-zA-Z0-9\.\-_]{2,64}@[a-zA-Z]{2,20})\b', re.IGNORECASE)
        for match in generic_upi_pattern.finditer(text):
            val = match.group(1).strip().lower().rstrip(".,;:")
            # If domain has '.' it is likely an email, unless it matches an approved handle
            parts = val.split("@")
            if len(parts) == 2 and "." not in parts[1]:
                vpas.add(val)

        return sorted(list(vpas))

    @classmethod
    def _extract_phone_numbers(cls, text: str) -> List[str]:
        """
        Extract Indian 10-digit mobile numbers with various formatting.
        """
        phones = set()
        for pat in cls.PHONE_PATTERNS:
            for match in pat.finditer(text):
                raw = match.group(0).strip()
                # Clean non-digits
                digits = re.sub(r'\D', '', raw)
                # If starts with 91 and has 12 digits, strip 91
                if len(digits) == 12 and digits.startswith("91"):
                    digits = digits[2:]
                elif len(digits) == 11 and digits.startswith("0"):
                    digits = digits[1:]
                
                if len(digits) == 10 and digits[0] in "6789":
                    phones.add(digits)
        return sorted(list(phones))

    @classmethod
    def _extract_urls_and_domains(cls, text: str) -> Tuple[List[str], List[str]]:
        """
        Extract URLs and constituent domains.
        """
        urls = set()
        domains = set()

        for match in cls.URL_PATTERN.finditer(text):
            raw = match.group(0).strip().rstrip(".,;)>]")
            if not raw.startswith("http://") and not raw.startswith("https://"):
                normalized_url = f"https://{raw}"
            else:
                normalized_url = raw
            urls.add(normalized_url)

            # Extract domain from url
            domain_part = re.sub(r'^https?://', '', normalized_url).split('/')[0].split(':')[0].lower()
            if domain_part:
                domains.add(domain_part)

        # Look for standalone suspicious domains (e.g. sbi-rewards-login.xyz, mahadiscom-bill.top)
        tld_pattern = re.compile(r'\b([a-zA-Z0-9\-]{2,50}\.(?:xyz|top|site|club|live|app|online|vip|tk|ml|ga|cf|gq|cc|buzz|link|info))\b', re.IGNORECASE)
        for match in tld_pattern.finditer(text):
            d = match.group(1).strip().lower()
            domains.add(d)
            if not any(d in u for u in urls):
                urls.add(f"https://{d}")

        return sorted(list(urls)), sorted(list(domains))

    @classmethod
    def _extract_sms_headers(cls, text: str) -> List[str]:
        """
        Extract Indian TRAI sender headers (e.g. AD-ETHIK, VM-SBIINB, VK-HDFCBK, AX-BOB).
        """
        headers = set()
        for match in cls.SMS_HEADER_PATTERN.finditer(text):
            h = match.group(1).upper().strip()
            # Must have hyphen or match known bank prefix patterns
            if "-" in h and len(h) >= 5:
                headers.add(h)
        return sorted(list(headers))

    @classmethod
    def _extract_apk_metadata(cls, text: str) -> Tuple[List[str], List[str]]:
        """
        Extract APK hashes (SHA-256, MD5) and APK file names.
        """
        hashes = set()
        names = set()

        for match in cls.SHA256_PATTERN.finditer(text):
            hashes.add(match.group(1).lower())
        for match in cls.MD5_PATTERN.finditer(text):
            hashes.add(match.group(1).lower())
        for match in cls.APK_PATTERN.finditer(text):
            names.add(match.group(1).strip())

        return sorted(list(hashes)), sorted(list(names))

    @classmethod
    def _extract_bank_details(cls, text: str) -> Tuple[List[str], List[str]]:
        """
        Extract Indian bank account numbers and IFSC codes.
        """
        accounts = set()
        ifscs = set()

        for match in cls.IFSC_PATTERN.finditer(text):
            ifscs.add(match.group(1).upper())

        # Match account numbers explicitly preceded by keywords
        acct_pattern = re.compile(r'(?:a/c|acct|account|acc\s*no\.?)\s*(?:is|:|-)?\s*([0-9]{9,18})\b', re.IGNORECASE)
        for match in acct_pattern.finditer(text):
            accounts.add(match.group(1).strip())

        return sorted(list(accounts)), sorted(list(ifscs))

    @classmethod
    def _extract_monetary_amounts(cls, text: str) -> List[str]:
        """
        Extract monetary amounts mentioned in the complaint.
        """
        amounts = []
        for match in cls.AMOUNT_PATTERN.finditer(text):
            amt = match.group(0).strip()
            if amt not in amounts:
                amounts.append(amt)
        return amounts

    @classmethod
    def _classify_scam(cls, text: str) -> Tuple[Dict[str, Any], List[str]]:
        """
        Score against known scam scenarios and return highest match with matched keywords.
        """
        text_lower = text.lower()
        best_scenario_key = "UPI_REFUND_QR_FRAUD"
        best_score = 0
        matched_keywords_for_best: List[str] = []

        for key, scenario in cls.SCAM_SCENARIOS.items():
            matched = [kw for kw in scenario["keywords"] if kw in text_lower]
            score = len(matched) * 10
            if score > best_score:
                best_score = score
                best_scenario_key = key
                matched_keywords_for_best = matched

        if best_score == 0:
            # Generic financial cyber fraud fallback
            return {
                "category": "Generic Online Financial Fraud / Phishing",
                "base_score": 60,
                "bns": ["Section 318(4) BNS (Cheating & Dishonestly Inducing Delivery of Property)"],
                "it_act": ["Section 66D IT Act (Punishment for Cheating by Personation by using Computer Resource)"]
            }, ["financial fraud"]

        return cls.SCAM_SCENARIOS[best_scenario_key], matched_keywords_for_best

    @classmethod
    def _calculate_severity(
        cls,
        scenario_match: Dict[str, Any],
        upi_count: int,
        url_count: int,
        apk_count: int,
        amount_count: int
    ) -> Tuple[int, str]:
        """
        Calculate threat severity (0-100) and discrete severity level.
        """
        score = scenario_match.get("base_score", 50)
        
        # Boost for critical threat indicators
        if upi_count > 0:
            score += 10
        if url_count > 0:
            score += 10
        if apk_count > 0:
            score += 15
        if amount_count > 0:
            score += 5

        # Clamp between 0 and 100
        score = min(100, max(10, score))

        if score >= 85:
            level = "CRITICAL"
        elif score >= 70:
            level = "HIGH"
        elif score >= 45:
            level = "MEDIUM"
        else:
            level = "LOW"

        return score, level

    @classmethod
    def _generate_summary(
        cls,
        category: str,
        upi_vpas: List[str],
        phones: List[str],
        urls: List[str],
        amounts: List[str],
        severity_level: str
    ) -> str:
        parts = [f"Classified as '{category}' with {severity_level} severity."]
        if upi_vpas:
            parts.append(f"Target VPA(s): {', '.join(upi_vpas)}.")
        if phones:
            parts.append(f"Originating Phone(s): {', '.join(phones)}.")
        if urls:
            parts.append(f"Phishing Link(s): {', '.join(urls)}.")
        if amounts:
            parts.append(f"Reported Disputed Amount(s): {', '.join(amounts)}.")
        return " ".join(parts)
