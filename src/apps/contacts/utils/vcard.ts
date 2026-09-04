import { Contact } from '../../../platform/types';

export function exportContactToVCard(contact: Contact): string {
  const lines: string[] = [
    'BEGIN:VCARD',
    'VERSION:3.0',
    `N:${contact.lastName || ''};${contact.firstName || ''};;;`,
    `FN:${`${contact.firstName || ''} ${contact.lastName || ''}`.trim()}`,
  ];

  if (contact.email) {
    lines.push(`EMAIL;TYPE=INTERNET,PREF:${contact.email}`);
  }
  if (contact.phone) {
    lines.push(`TEL;TYPE=CELL,VOICE:${contact.phone}`);
  }
  if (contact.company || contact.organization) {
    lines.push(`ORG:${contact.organization || contact.company}`);
  }
  if (contact.jobTitle) {
    lines.push(`TITLE:${contact.jobTitle}`);
  }
  if (contact.address) {
    lines.push(`ADR;TYPE=WORK:;;${contact.address.replace(/,/g, '\\,')};;;;`);
  }
  if (contact.website) {
    lines.push(`URL:${contact.website}`);
  }
  if (contact.birthday) {
    lines.push(`BDAY:${contact.birthday}`);
  }
  if (contact.notes) {
    lines.push(`NOTE:${contact.notes.replace(/\n/g, '\\n')}`);
  }
  if (contact.labels && contact.labels.length > 0) {
    lines.push(`CATEGORIES:${contact.labels.join(',')}`);
  }

  lines.push('END:VCARD');
  return lines.join('\r\n');
}

export function exportContactsToVCard(contacts: Contact[]): string {
  return contacts.map(exportContactToVCard).join('\r\n\r\n');
}

export function parseVCardString(vcardText: string): Partial<Contact>[] {
  const contacts: Partial<Contact>[] = [];
  const vcardBlocks = vcardText.split(/BEGIN:VCARD/i).filter(b => b.trim().length > 0);

  for (const block of vcardBlocks) {
    const lines = block.split(/\r?\n/);
    let firstName = '';
    let lastName = '';
    let email = '';
    let phone = '';
    let company = '';
    let jobTitle = '';
    let address = '';
    let website = '';
    let birthday = '';
    let notes = '';
    let labels: string[] = [];

    for (const rawLine of lines) {
      const line = rawLine.trim();
      if (!line || line.toUpperCase().startsWith('END:VCARD')) continue;

      if (line.toUpperCase().startsWith('FN:')) {
        const full = line.substring(3).trim();
        const parts = full.split(' ');
        if (parts.length > 1) {
          firstName = parts.slice(0, -1).join(' ');
          lastName = parts[parts.length - 1];
        } else {
          firstName = full;
        }
      } else if (line.toUpperCase().startsWith('N:')) {
        const parts = line.substring(2).split(';');
        lastName = parts[0] || lastName;
        firstName = parts[1] || firstName;
      } else if (line.toUpperCase().includes('EMAIL')) {
        const idx = line.indexOf(':');
        if (idx !== -1) email = line.substring(idx + 1).trim();
      } else if (line.toUpperCase().includes('TEL')) {
        const idx = line.indexOf(':');
        if (idx !== -1) phone = line.substring(idx + 1).trim();
      } else if (line.toUpperCase().startsWith('ORG:')) {
        company = line.substring(4).trim();
      } else if (line.toUpperCase().startsWith('TITLE:')) {
        jobTitle = line.substring(6).trim();
      } else if (line.toUpperCase().includes('ADR')) {
        const idx = line.indexOf(':');
        if (idx !== -1) {
          address = line.substring(idx + 1).replace(/;/g, ' ').replace(/\\,/g, ',').trim();
        }
      } else if (line.toUpperCase().startsWith('URL:')) {
        website = line.substring(4).trim();
      } else if (line.toUpperCase().startsWith('BDAY:')) {
        birthday = line.substring(5).trim();
      } else if (line.toUpperCase().startsWith('NOTE:')) {
        notes = line.substring(5).replace(/\\n/g, '\n').trim();
      } else if (line.toUpperCase().startsWith('CATEGORIES:')) {
        labels = line.substring(11).split(',').map(s => s.trim());
      }
    }

    if (firstName || lastName || email || phone) {
      contacts.push({
        firstName,
        lastName,
        email,
        phone,
        company,
        jobTitle,
        address,
        website,
        birthday,
        notes,
        labels,
      });
    }
  }

  return contacts;
}

export function downloadVCardFile(filename: string, content: string) {
  const blob = new Blob([content], { type: 'text/vcard;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', filename.endsWith('.vcf') ? filename : `${filename}.vcf`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
