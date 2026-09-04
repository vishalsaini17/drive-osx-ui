import { Contact } from '../../../platform/types';

export function exportContactsToCSV(contacts: Contact[]): string {
  const headers = [
    'First Name',
    'Last Name',
    'Email',
    'Phone',
    'Company',
    'Job Title',
    'Department',
    'Team',
    'Address',
    'Website',
    'Birthday',
    'Notes',
    'Labels',
    'Organization'
  ];

  const escapeField = (val?: string) => {
    if (!val) return '""';
    const clean = val.replace(/"/g, '""');
    return `"${clean}"`;
  };

  const rows = contacts.map(c => [
    escapeField(c.firstName),
    escapeField(c.lastName),
    escapeField(c.email),
    escapeField(c.phone),
    escapeField(c.company),
    escapeField(c.jobTitle),
    escapeField(c.department),
    escapeField(c.team),
    escapeField(c.address),
    escapeField(c.website),
    escapeField(c.birthday),
    escapeField(c.notes),
    escapeField(c.labels ? c.labels.join(';') : ''),
    escapeField(c.organization),
  ].join(','));

  return [headers.join(','), ...rows].join('\r\n');
}

export function parseCSVString(csvText: string): Partial<Contact>[] {
  const lines = csvText.split(/\r?\n/).filter(l => l.trim().length > 0);
  if (lines.length < 2) return [];

  const parseLine = (line: string): string[] => {
    const result: string[] = [];
    let cur = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (char === '"') {
        if (inQuotes && line[i + 1] === '"') {
          cur += '"';
          i++;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (char === ',' && !inQuotes) {
        result.push(cur.trim());
        cur = '';
      } else {
        cur += char;
      }
    }
    result.push(cur.trim());
    return result;
  };

  const headers = parseLine(lines[0]).map(h => h.toLowerCase().trim());
  
  const getIndex = (...possibleNames: string[]) => {
    for (const name of possibleNames) {
      const idx = headers.findIndex(h => h.includes(name.toLowerCase()));
      if (idx !== -1) return idx;
    }
    return -1;
  };

  const fnIdx = getIndex('first name', 'firstname', 'given name', 'name');
  const lnIdx = getIndex('last name', 'lastname', 'family name');
  const emailIdx = getIndex('email', 'e-mail', 'mail');
  const phoneIdx = getIndex('phone', 'tel', 'mobile', 'cell');
  const companyIdx = getIndex('company', 'organization', 'org');
  const titleIdx = getIndex('job title', 'title', 'role');
  const deptIdx = getIndex('department', 'dept');
  const teamIdx = getIndex('team');
  const addrIdx = getIndex('address', 'location');
  const webIdx = getIndex('website', 'url', 'web');
  const bdayIdx = getIndex('birthday', 'bday', 'birth');
  const noteIdx = getIndex('notes', 'note', 'memo');
  const labelIdx = getIndex('labels', 'label', 'groups', 'category');

  const contacts: Partial<Contact>[] = [];

  for (let i = 1; i < lines.length; i++) {
    const cols = parseLine(lines[i]);
    if (cols.length === 0) continue;

    const firstName = fnIdx !== -1 ? cols[fnIdx] : '';
    const lastName = lnIdx !== -1 ? cols[lnIdx] : '';
    const email = emailIdx !== -1 ? cols[emailIdx] : '';
    const phone = phoneIdx !== -1 ? cols[phoneIdx] : '';

    if (!firstName && !lastName && !email && !phone) continue;

    const labelsRaw = labelIdx !== -1 ? cols[labelIdx] : '';
    const labels = labelsRaw ? labelsRaw.split(/;|\||,/).map(s => s.trim()).filter(Boolean) : [];

    contacts.push({
      firstName: firstName || 'Unnamed',
      lastName,
      email,
      phone,
      company: companyIdx !== -1 ? cols[companyIdx] : '',
      jobTitle: titleIdx !== -1 ? cols[titleIdx] : '',
      department: deptIdx !== -1 ? cols[deptIdx] : '',
      team: teamIdx !== -1 ? cols[teamIdx] : '',
      address: addrIdx !== -1 ? cols[addrIdx] : '',
      website: webIdx !== -1 ? cols[webIdx] : '',
      birthday: bdayIdx !== -1 ? cols[bdayIdx] : '',
      notes: noteIdx !== -1 ? cols[noteIdx] : '',
      labels,
    });
  }

  return contacts;
}

export function downloadCSVFile(filename: string, content: string) {
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', filename.endsWith('.csv') ? filename : `${filename}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
