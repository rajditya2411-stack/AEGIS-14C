import os
from reportlab.lib.pagesizes import letter
from reportlab.lib import colors
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle

def generate_pdf():
    pdf_path = r"C:\Users\inatel\.gemini\antigravity\brain\760619c9-6463-4518-9a01-066901863c6a\aegis_features_guide.pdf"
    
    # Page setup
    doc = SimpleDocTemplate(
        pdf_path,
        pagesize=letter,
        rightMargin=40,
        leftMargin=40,
        topMargin=40,
        bottomMargin=40
    )
    
    styles = getSampleStyleSheet()
    
    # Custom styles
    title_style = ParagraphStyle(
        'DocTitle',
        parent=styles['Heading1'],
        fontName='Helvetica-Bold',
        fontSize=20,
        leading=24,
        textColor=colors.HexColor('#0f172a'),
        spaceAfter=15
    )
    
    sec_style = ParagraphStyle(
        'SecTitle',
        parent=styles['Heading2'],
        fontName='Helvetica-Bold',
        fontSize=12,
        leading=16,
        textColor=colors.HexColor('#1e3a8a'),
        spaceBefore=12,
        spaceAfter=6
    )
    
    header_style = ParagraphStyle(
        'TableHeader',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=9,
        leading=11,
        textColor=colors.white
    )
    
    cell_style = ParagraphStyle(
        'TableCell',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=8.5,
        leading=11,
        textColor=colors.HexColor('#334155')
    )

    cell_bold_style = ParagraphStyle(
        'TableCellBold',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=8.5,
        leading=11,
        textColor=colors.HexColor('#0f172a')
    )
    
    story = []
    
    # Document Title
    story.append(Paragraph("AEGIS-14C: Operational Feature & Interface Guide", title_style))
    story.append(Paragraph("A concise tabular map detailing all controls, buttons, and automated modules inside the workspace.", cell_style))
    story.append(Spacer(1, 15))
    
    # Table Style
    t_style = TableStyle([
        ('BACKGROUND', (0,0), (-1,0), colors.HexColor('#1e293b')),
        ('ALIGN', (0,0), (-1,-1), 'LEFT'),
        ('VALIGN', (0,0), (-1,-1), 'TOP'),
        ('BOTTOMPADDING', (0,0), (-1,0), 6),
        ('TOPPADDING', (0,0), (-1,0), 6),
        ('GRID', (0,0), (-1,-1), 0.5, colors.HexColor('#cbd5e1')),
        ('ROWBACKGROUNDS', (0,1), (-1,-1), [colors.white, colors.HexColor('#f8fafc')]),
        ('BOTTOMPADDING', (0,1), (-1,-1), 5),
        ('TOPPADDING', (0,1), (-1,-1), 5),
    ])

    col_widths = [130, 90, 310]
    
    # --- Section 1 ---
    story.append(Paragraph("1. Navigation Panel (Slim Left Strip)", sec_style))
    data1 = [
        [Paragraph("Icon / Module", header_style), Paragraph("Action Trigger", header_style), Paragraph("Operational Purpose", header_style)],
        [
            Paragraph("Workspace Graph (LayoutGrid)", cell_bold_style),
            Paragraph("Left Click", cell_style),
            Paragraph("Opens the interactive React Flow graph canvas. Shows relationships between suspect VPAs, phishing domains, phone numbers, and bank accounts.", cell_style)
        ],
        [
            Paragraph("Timeline View (Clock)", cell_bold_style),
            Paragraph("Left Click", cell_style),
            Paragraph("Displays a chronological flow of audit records and discovery events tracking how threat intelligence was gathered over time.", cell_style)
        ],
        [
            Paragraph("Snapshots & Diff (GitCompare)", cell_bold_style),
            Paragraph("Left Click", cell_style),
            Paragraph("Compares Snapshot #1 and Snapshot #2 side-by-side. Automatically calculates and displays what changed (Added/Removed/Modified entities).", cell_style)
        ],
        [
            Paragraph("Settings (Settings)", cell_bold_style),
            Paragraph("Left Click", cell_style),
            Paragraph("Opens configuration panel to select AI model provider (Gemini/Ollama) and input your custom API keys (Gemini, HaveIBeenPwned, etc.).", cell_style)
        ],
        [
            Paragraph("Help Manual (HelpCircle)", cell_bold_style),
            Paragraph("Left Click", cell_style),
            Paragraph("Displays the onboard user manual containing quickstart guides, canvas mouse controls, and legal mandate descriptions.", cell_style)
        ]
    ]
    t1 = Table(data1, colWidths=col_widths)
    t1.setStyle(t_style)
    story.append(t1)
    story.append(Spacer(1, 10))
    
    # --- Section 2 ---
    story.append(Paragraph("2. Cases & Intake Control (Secondary Sidebar)", sec_style))
    data2 = [
        [Paragraph("Action Button", header_style), Paragraph("Location", header_style), Paragraph("Operational Purpose", header_style)],
        [
            Paragraph("+ (Create Case)", cell_bold_style),
            Paragraph("Active Cases Header", cell_style),
            Paragraph("Opens a manual configuration window to create a case by specifying a brand name, domain, or suspect username.", cell_style)
        ],
        [
            Paragraph("Case Selection Card", cell_bold_style),
            Paragraph("Active Cases List", cell_style),
            Paragraph("Left-clicking loads the respective case graph, timelines, notes, and legal directives on the canvas.", cell_style)
        ],
        [
            Paragraph("Trash (Delete Case)", cell_bold_style),
            Paragraph("Case Card (Hover)", cell_style),
            Paragraph("Triggers a cascading clean database delete removing all associated entities, edges, notes, transactions, and legal freeze documents.", cell_style)
        ],
        [
            Paragraph("Scraper Console", cell_bold_style),
            Paragraph("Secondary Sidebar", cell_style),
            Paragraph("Displays real-time logs indicating scanning status, domain registration ages, and active database transactions.", cell_style)
        ]
    ]
    t2 = Table(data2, colWidths=col_widths)
    t2.setStyle(t_style)
    story.append(t2)
    story.append(Spacer(1, 10))
    
    # --- Section 3 ---
    story.append(Paragraph("3. Graph Canvas & HUD Controls (Top & Bottom Canvas)", sec_style))
    data3 = [
        [Paragraph("Action Button", header_style), Paragraph("Location", header_style), Paragraph("Operational Purpose", header_style)],
        [
            Paragraph("+ Launch OSINT Scan", cell_bold_style),
            Paragraph("Top HUD Panel", cell_style),
            Paragraph("Triggers deterministic zero-trust collectors (DNS lookup, WHOIS checks, SSL transparency logs, HIBP leak logs, and social cascades) on the target.", cell_style)
        ],
        [
            Paragraph("+ Add Entity", cell_bold_style),
            Paragraph("Top HUD Panel", cell_style),
            Paragraph("Opens a modal to manually insert custom entities (e.g. standardizing new bank accounts, IP addresses, or phone numbers) to the canvas.", cell_style)
        ],
        [
            Paragraph("AI Assistant (Sparkles)", cell_bold_style),
            Paragraph("Top HUD Panel (Right)", cell_style),
            Paragraph("Expands the collapsible AI panel. Submits SQLite graph topology into Google Gemini to generate grounded, hallucination-free summaries.", cell_style)
        ],
        [
            Paragraph("Node Inspector (Info)", cell_bold_style),
            Paragraph("Top HUD Panel (Right)", cell_style),
            Paragraph("Toggles the detail inspector drawer showing evidence levels (CONFIRMED, OBSERVED, INFERRED) and transaction lists.", cell_style)
        ]
    ]
    t3 = Table(data3, colWidths=col_widths)
    t3.setStyle(t_style)
    story.append(t3)
    story.append(Spacer(1, 10))
    
    # --- Section 4 ---
    story.append(Paragraph("4. Inspector Drawer Tabs (Right Sidebar)", sec_style))
    data4 = [
        [Paragraph("Tab / Button", header_style), Paragraph("Location", header_style), Paragraph("Operational Purpose", header_style)],
        [
            Paragraph("Details / Node Info", cell_bold_style),
            Paragraph("Inspector Tab 1", cell_style),
            Paragraph("Displays metadata, timestamps, and geolocation profiles for the selected entity.", cell_style)
        ],
        [
            Paragraph("Relationships", cell_bold_style),
            Paragraph("Inspector Tab 2", cell_style),
            Paragraph("Standardizes the connection of new edge relations (e.g., VPA requests_payment_to a Bank Account) with custom confidence scores.", cell_style)
        ],
        [
            Paragraph("Legal Directives", cell_bold_style),
            Paragraph("Inspector Tab 3", cell_style),
            Paragraph("Displays pre-drafted Section 106 BNSS Bank Debit Freeze Notices mapped to BNS 2023 offenses for law enforcement.", cell_style)
        ],
        [
            Paragraph("Evidence Ledger", cell_bold_style),
            Paragraph("Inspector Tab 4", cell_style),
            Paragraph("Shows DPDP 2023 compliant audit ledger logs. Clicking Verify Ledger runs a cryptographic SHA-256 Merkle chain verification to detect database tampering.", cell_style)
        ],
        [
            Paragraph("Download Freeze Notice", cell_bold_style),
            Paragraph("Legal Tab (Button)", cell_style),
            Paragraph("Exports the pre-filled court-admissible PDF Section 106 BNSS Freeze Notice directly to the local download folder.", cell_style)
        ],
        [
            Paragraph("Download Incident Report", cell_bold_style),
            Paragraph("Details Tab (Button)", cell_style),
            Paragraph("Generates and exports a complete publication-ready AEGIS Forensic Incident & Cluster Dossier PDF containing all case notes and graphs.", cell_style)
        ]
    ]
    t4 = Table(data4, colWidths=col_widths)
    t4.setStyle(t_style)
    story.append(t4)
    
    doc.build(story)
    print("PDF Guide generated successfully!")

if __name__ == "__main__":
    generate_pdf()
