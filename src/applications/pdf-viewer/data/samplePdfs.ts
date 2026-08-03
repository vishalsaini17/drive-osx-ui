import { PDFDocumentData } from '../types';

export const SAMPLE_PDFS: PDFDocumentData[] = [
  {
    id: 'pdf_annual_report',
    title: 'Enterprise Q3 Strategic & Financial Performance Report',
    fileName: 'Enterprise_Q3_Financial_Report_2026.pdf',
    fileSize: '2.4 MB',
    totalPages: 4,
    author: 'Corporate Financial Office',
    createdAt: '2026-07-28',
    isPasswordProtected: false,
    bookmarks: [
      { id: 'bm_1', title: '1. Executive Summary & Growth', pageIndex: 0 },
      { id: 'bm_2', title: '2. Financial Metrics & Breakdown', pageIndex: 1 },
      { id: 'bm_3', title: '3. Technical Infrastructure Milestones', pageIndex: 2 },
      { id: 'bm_4', title: '4. Risk Analysis & Q4 Outlook', pageIndex: 3 },
    ],
    pages: [
      {
        pageNumber: 1,
        title: 'Executive Summary & Key Highlights',
        contentLines: [
          'CONFIDENTIAL • FOR INTERNAL EXECUTIVE DISTRIBUTION ONLY',
          'During Q3 2026, Enterprise Drive OS demonstrated exceptional growth, achieving $42.8M in annualized recurring revenue (ARR), representing a 138% Year-over-Year increase.',
          'Key strategic drivers included rapid adoption of our zero-trust collaborative file systems and localized containerized virtual desktops across enterprise clients.',
          'Our user satisfaction score reached an all-time high of 4.92 out of 5.0, supported by sub-50ms peer delta synchronization and enhanced data residency compliance.',
        ],
        keyFacts: [
          'ARR Growth: 138% YoY ($42.8M)',
          'Net Dollar Retention: 128%',
          'Active Monthly Users: 420,000+',
          'Global Latency Average: 34ms',
        ],
      },
      {
        pageNumber: 2,
        title: 'Quarterly Revenue & Revenue Segment Breakdown',
        contentLines: [
          'The primary revenue engine was driven by Enterprise Tier subscriptions (64%), followed by Mid-Market Growth (26%) and Custom Integration Services (10%).',
          'Operating margins expanded by 420 basis points, driven by infrastructure efficiency gains in our Cloud Run dynamic provisioning pipeline.',
          'Capital expenditures remained disciplined at 8.2% of total revenue, focusing heavily on R&D for real-time multiplayer audio-visual collaboration.',
        ],
        tables: [
          {
            headers: ['Segment', 'Q1 2026', 'Q2 2026', 'Q3 2026', 'YoY Delta'],
            rows: [
              ['Enterprise Cloud', '$18.2M', '$22.5M', '$27.4M', '+142%'],
              ['Mid-Market SaaS', '$7.1M', '$9.3M', '$11.1M', '+115%'],
              ['Professional Services', '$2.8M', '$3.5M', '$4.3M', '+88%'],
              ['Total Net Revenue', '$28.1M', '$35.3M', '$42.8M', '+138%'],
            ],
          },
        ],
      },
      {
        pageNumber: 3,
        title: 'Technical Infrastructure & System Milestones',
        contentLines: [
          'Architecture Refactoring: Successfully transitioned to CRDT-backed real-time document buffers across Paint Studio, Spreadsheets, and Presentation Studio.',
          'Security Hardening: Completed SOC2 Type II audit certification with zero high or critical findings across all regional endpoints.',
          'Disaster Recovery: Implemented active-active multi-region failover with zero-data-loss recovery time objective (RTO) under 12 seconds.',
          'Developer Ecosystem: Released 18 new SDK connectors for third-party OAuth, cloud storage providers, and analytics pipelines.',
        ],
        keyFacts: [
          'System Uptime: 99.994%',
          'SOC2 Type II: Certified',
          'RTO / RPO: < 12 seconds',
          'API Endpoint Volume: 1.2B req/day',
        ],
      },
      {
        pageNumber: 4,
        title: 'Risk Analysis, Compliance & Q4 Outlook',
        contentLines: [
          'Looking ahead to Q4 2026, management projects total net revenue between $52.0M and $55.5M, driven by global market expansion in EMEA and APAC.',
          'Key strategic priorities include launching AI-powered document intelligence, native vector PDF search indexing, and offline-first mobile desktop clients.',
          'Risk Mitigation: Supply chain hardware costs are stabilized under long-term cloud reservation agreements. Regulatory compliance frameworks (GDPR, HIPAA, FedRAMP) are fully enforced.',
        ],
        tables: [
          {
            headers: ['Objective', 'Owner', 'Target Date', 'Status'],
            rows: [
              ['Vector PDF Indexing', 'AI Engineering', 'Nov 15, 2026', 'In Progress'],
              ['EMEA Data Center', 'Infra Core', 'Dec 01, 2026', 'On Schedule'],
              ['FedRAMP Moderate', 'Security Risk', 'Q1 2027', 'Auditing'],
            ],
          },
        ],
      },
    ],
  },
  {
    id: 'pdf_api_spec',
    title: 'Drive OS API Developer Manual & Protocols',
    fileName: 'Drive_OS_API_Specifications_v2.4.pdf',
    fileSize: '1.8 MB',
    totalPages: 3,
    author: 'Developer Ecosystem Team',
    createdAt: '2026-08-01',
    isPasswordProtected: false,
    bookmarks: [
      { id: 'bmap_1', title: '1. Authentication & Bearer Tokens', pageIndex: 0 },
      { id: 'bmap_2', title: '2. Virtual File System Endpoints', pageIndex: 1 },
      { id: 'bmap_3', title: '3. Webhooks & Real-time Events', pageIndex: 2 },
    ],
    pages: [
      {
        pageNumber: 1,
        title: 'Authentication & Security Tokens',
        contentLines: [
          'Drive OS REST API v2.4 Specification Protocol',
          'All API requests require TLS 1.3 encryption and must include an Authorization header containing a valid OAuth 2.0 Bearer token.',
          'Header Format: Authorization: Bearer <access_token_jwt>',
          'Rate Limits: Standard tier accounts are capped at 1,000 requests per minute. Enterprise endpoints support up to 50,000 requests per minute with burst allowance.',
        ],
        keyFacts: [
          'Protocol: HTTPS TLS 1.3',
          'Auth Standard: OAuth 2.0 / JWT',
          'Default Timeout: 5000ms',
        ],
      },
      {
        pageNumber: 2,
        title: 'Virtual File System & Stream Operations',
        contentLines: [
          'GET /api/v2/files - Retrieves directory tree and metadata objects for the authenticated user context.',
          'POST /api/v2/files/upload - Accepts multipart binary payloads up to 500MB per file with chunked retry resume logic.',
          'DELETE /api/v2/files/{id} - Moves target file to system Trash Bin with 30-day recovery retention window.',
        ],
        tables: [
          {
            headers: ['HTTP Method', 'Path', 'Description', 'Status Code'],
            rows: [
              ['GET', '/api/v2/files', 'List virtual files', '200 OK'],
              ['POST', '/api/v2/files', 'Create file entry', '201 Created'],
              ['GET', '/api/v2/files/:id/content', 'Stream binary bytes', '200 OK'],
              ['PATCH', '/api/v2/files/:id', 'Update permissions', '200 OK'],
            ],
          },
        ],
      },
      {
        pageNumber: 3,
        title: 'Webhooks & Delta Sync Callbacks',
        contentLines: [
          'Applications can subscribe to asynchronous real-time events by configuring HTTPS webhook listeners in the Developer Portal.',
          'Supported Events: file.created, file.updated, file.deleted, permissions.granted, annotation.added.',
          'Payload Verification: Every webhook request contains an X-DriveOS-Signature header created using HMAC-SHA256 with your app secret.',
        ],
      },
    ],
  },
  {
    id: 'pdf_locked_contract',
    title: 'Confidential Non-Disclosure Agreement (Password Protected)',
    fileName: 'Confidential_NDA_Contract_Locked.pdf',
    fileSize: '950 KB',
    totalPages: 2,
    author: 'Legal & Risk Compliance',
    createdAt: '2026-08-02',
    isPasswordProtected: true,
    password: 'drive',
    isLocked: true,
    bookmarks: [
      { id: 'bml_1', title: '1. Confidentiality Clauses', pageIndex: 0 },
      { id: 'bml_2', title: '2. Signatures & Execution', pageIndex: 1 },
    ],
    pages: [
      {
        pageNumber: 1,
        title: 'MUTUAL NON-DISCLOSURE AGREEMENT',
        contentLines: [
          'RESTRICTED & ENCRYPTED DOCUMENT - UNLOCKED WITH PASSWORD "drive"',
          'This Mutual Non-Disclosure Agreement ("Agreement") is entered into by and between Enterprise Drive OS, Inc. and Receiving Party.',
          'The parties agree to hold in strict confidence all proprietary technical, financial, and business information disclosed during technology evaluation discussions.',
          'Term: The obligations of non-disclosure shall remain in effect for a period of five (5) years from the date of initial execution.',
        ],
        keyFacts: [
          'Security Level: Ultra Secret',
          'Jurisdiction: Delaware, USA',
          'Term Length: 5 Years',
        ],
      },
      {
        pageNumber: 2,
        title: 'EXECUTIVE SIGNATURES & GOVERNING LAW',
        contentLines: [
          'IN WITNESS WHEREOF, the parties have executed this Mutual Non-Disclosure Agreement as of the date first set forth above.',
          'Signed on behalf of Enterprise Drive OS, Inc.: Sarah Chen, VP Technology & Operations.',
          'Signed on behalf of Client Partner: Approved & Verified digitally via Cryptographic Key Signature.',
        ],
      },
    ],
  },
];
