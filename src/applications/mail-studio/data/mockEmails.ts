import { Email, CustomFolder, Contact, EmailRule } from '../types';

export const INITIAL_CUSTOM_FOLDERS: CustomFolder[] = [
  { id: 'cf-1', name: 'Tax & Legal 2026', color: 'bg-emerald-500' },
  { id: 'cf-2', name: 'Design Specs', color: 'bg-purple-500' },
  { id: 'cf-3', name: 'Client Invoices', color: 'bg-amber-500' },
];

export const INITIAL_CONTACTS: Contact[] = [
  { id: 'c-1', name: 'Sarah Jenkins', email: 'sarah.j@techcorp.io', avatarBg: 'bg-emerald-600', role: 'Lead UI/UX Designer' },
  { id: 'c-2', name: 'Alex Rivers', email: 'arivers@creativeminds.org', avatarBg: 'bg-amber-600', role: 'Senior Frontend Architect' },
  { id: 'c-3', name: 'Marcus Vance', email: 'm.vance@enterprise-sys.com', avatarBg: 'bg-purple-600', role: 'Security Compliance Lead' },
  { id: 'c-4', name: 'Elena Rostova', email: 'elena@cloudrun-infra.net', avatarBg: 'bg-rose-600', role: 'DevOps & Site Reliability' },
  { id: 'c-5', name: 'Drive OSX Support', email: 'support@drive-osx.local', avatarBg: 'bg-blue-600', role: 'System Admin' },
];

export const INITIAL_RULES: EmailRule[] = [
  {
    id: 'rule-1',
    name: 'Auto-Label Design Updates',
    conditionField: 'subject',
    conditionValue: 'Design',
    action: 'addLabel',
    actionValue: 'Work',
    enabled: true,
  },
  {
    id: 'rule-2',
    name: 'Block Suspicious Phishing',
    conditionField: 'sender',
    conditionValue: 'phishing@badactor.xyz',
    action: 'markSpam',
    actionValue: 'spam',
    enabled: true,
  },
];

export const INITIAL_EMAILS: Email[] = [
  {
    id: 'mail-1',
    senderName: 'Drive OSX System',
    senderEmail: 'system@drive-osx.local',
    avatarBg: 'bg-blue-600',
    recipientEmail: 'vishalsaini154@gmail.com',
    subject: 'Welcome to Drive OSX Mail Studio ✉️',
    preview: 'Your new mail client is ready. Manage accounts, compose rich emails, and collaborate smoothly.',
    body: `Hello Vishal,

Welcome to your new **Drive OSX Mail Studio**!

Here are some highlights of your upgraded mail suite:
• **Folder Management**: Inbox, Sent, Drafts, Outbox, Trash, Spam, Archive, plus Custom Folders.
• **Rich Compose & Formatting**: Custom Fonts, Text Colors, Tables, Lists, Hyperlinks, Inline Images & Signatures.
• **Drive Integration**: Attach files directly from DriveOSX System Drive or save received attachments.
• **Collaboration Tools**: Convert email directly into Calendar events or Tasks, Share emails, & Forward as attachments.
• **Security & Rules**: Block senders, Spam filtering, and Custom Email Rule Automation.

Enjoy working with Drive OSX Mail Studio!

Best regards,  
*The Drive OSX System Team*`,
    timestamp: '10:14 AM',
    dateISO: new Date().toISOString(),
    folder: 'inbox',
    isUnread: true,
    isStarred: true,
    isImportant: true,
    isPinned: true,
    labels: ['Work', 'Important'],
  },
  {
    id: 'mail-2',
    senderName: 'Sarah Jenkins',
    senderEmail: 'sarah.j@techcorp.io',
    avatarBg: 'bg-emerald-600',
    recipientEmail: 'vishalsaini154@gmail.com',
    subject: 'Q3 UI/UX Design System Review & Roadmap',
    preview: 'I have attached the initial mockup slides for the upcoming dark and light theme tokens...',
    body: `Hi Vishal,

Hope you're having a productive week!

I've attached the initial mockup slides and token specifications for the upcoming Q3 Design System overhaul. Key updates include:
1. Updated typography scale with high-contrast display pairings.
2. Mathematically calculated component padding and nesting border-radii.
3. Enhanced accessibility guidelines for high-contrast light mode.

Could you review lines 14-28 in the design spec and let me know if we can schedule a quick 15-minute sync on OSX Meet tomorrow?

Thanks,  
Sarah`,
    timestamp: 'Yesterday',
    dateISO: new Date(Date.now() - 86400000).toISOString(),
    folder: 'inbox',
    isUnread: true,
    isStarred: false,
    isImportant: true,
    isPinned: false,
    labels: ['Work'],
    attachments: [
      { id: 'att-1', name: 'Design_System_Tokens_v2.pdf', size: '2.4 MB', type: 'PDF' },
      { id: 'att-2', name: 'Q3_Mockups_Preview.png', size: '1.1 MB', type: 'IMAGE' }
    ]
  },
  {
    id: 'mail-3',
    senderName: 'GitHub Notifications',
    senderEmail: 'notifications@github.com',
    avatarBg: 'bg-zinc-700',
    recipientEmail: 'vishalsaini154@gmail.com',
    subject: '[Release] v2.4.0 Calendar Week View & Multi-Tool Paint Updates',
    preview: 'Pull request #142 was successfully merged into main branch with 0 lint errors...',
    body: `**GitHub Workflow Summary**

Repository: \`drive-osx-ui / applet-main\`
Action: **Pull Request Merged (#142)**
Author: @vishalsaini154

**Changes included in this release:**
- Added 7-day Week View in CalendarApp with time grid & timezone display
- Dynamic canvas cursors and inline text formatting tools in PaintApp
- Updated system store hooks and window viewport clamping

Build Status: **Passing (100%)**
Deployed to Cloud Run Preview container successfully.`,
    timestamp: 'Jul 26',
    dateISO: new Date(Date.now() - 172800000).toISOString(),
    folder: 'inbox',
    isUnread: false,
    isStarred: true,
    isPinned: false,
    labels: ['Updates'],
  },
  {
    id: 'mail-4',
    senderName: 'Alex Rivers',
    senderEmail: 'arivers@creativeminds.org',
    avatarBg: 'bg-amber-600',
    recipientEmail: 'vishalsaini154@gmail.com',
    subject: 'Coffee & Project Collaboration Idea',
    preview: 'Loved your latest web OS showcase! Would love to chat about integrating a real-time canvas widget...',
    body: `Hey Vishal!

I saw your recent update to Drive OSX—it looks super clean!

I'm currently building a collaborative whiteboarding tool and was wondering if you'd be interested in exploring an integration or sharing ideas over coffee sometime this week.

Let me know what time works best for you!

Cheers,  
Alex`,
    timestamp: 'Jul 24',
    dateISO: new Date(Date.now() - 300000000).toISOString(),
    folder: 'inbox',
    isUnread: false,
    isStarred: false,
    isPinned: false,
    labels: ['Personal'],
  },
  {
    id: 'mail-5',
    senderName: 'Crypto Investment Deal',
    senderEmail: 'spammer@fakedeals.xyz',
    avatarBg: 'bg-rose-700',
    recipientEmail: 'vishalsaini154@gmail.com',
    subject: 'URGENT: Guaranteed 500% ROI in 24 Hours!',
    preview: 'Claim your unverified token rewards by clicking this untrusted link immediately...',
    body: `Dear User,

You have been selected for an exclusive cryptocurrency reward giveaway.
Please click the link below to verify your wallet address and claim 10,000 USDT.

http://fake-untrusted-crypto-rewards.xyz/claim

Do not share this email.`,
    timestamp: 'Jul 20',
    dateISO: new Date(Date.now() - 600000000).toISOString(),
    folder: 'spam',
    isUnread: true,
    isStarred: false,
    isPinned: false,
    labels: [],
  },
  {
    id: 'mail-6',
    senderName: 'Finance Department',
    senderEmail: 'billing@enterprise.io',
    avatarBg: 'bg-emerald-700',
    recipientEmail: 'vishalsaini154@gmail.com',
    subject: 'Annual Tax Statement & License Receipts 2026',
    preview: 'Please store this statement for tax audit compliance and enterprise licensing records...',
    body: `Hi Vishal,

Attached is your annual tax deduction receipt and enterprise license documentation for 2026.

Summary of Invoice #INV-2026-9902:
- Service: Enterprise Drive OSX Cloud Compute
- Total Paid: $1,200.00
- Payment Method: Corporate Visa ending in **** 8821

Best regards,  
Finance Office`,
    timestamp: 'Jul 18',
    dateISO: new Date(Date.now() - 800000000).toISOString(),
    folder: 'cf-1', // Custom folder: Tax & Legal 2026
    isUnread: false,
    isStarred: true,
    isImportant: true,
    isPinned: false,
    labels: ['Work', 'Important'],
    attachments: [
      { id: 'att-tax-1', name: 'Tax_Receipt_2026.pdf', size: '1.2 MB', type: 'PDF' }
    ]
  }
];
