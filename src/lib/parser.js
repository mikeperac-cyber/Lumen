// src/lib/parser.js
// Natural-language task parser. Pure — all context arrives via `deps`.

/**
 * @param {Date} d
 * @returns {string} YYYY-MM-DD (local), matching app.js isoDate()
 */
function isoLocal(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/**
 * @param {Date} base
 * @param {number} n
 * @returns {Date}
 */
function shift(base, n) { const d = new Date(base); d.setDate(d.getDate() + n); return d; }

/**
 * @param {string} rawText
 * @param {{students?:{id:string,name:string}[],projects?:{id:string,name:string}[],goals?:{id:string,title:string}[],now?:Date}} [deps]
 * @returns {object|null}
 */
const escapeRegExp = (str) => str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

export function parseNaturalLanguageTask(rawText, deps) {
  const d = deps || {};
  const studentsList = d.students || [];
  const projects = d.projects || [];
  const goals = d.goals || [];
  const today = d.now || new Date();
  const todayIso = isoLocal(today);

  let text = String(rawText || '').trim();
  if (text.length > 500) text = text.slice(0, 500);
  if (!text) return null;

  let due = '';
  let startTime = '';
  let priority = 'med';
  const tags = [];
  const category = '';
  let goalId = '';
  let projectId = '';
  let status = 'backlog';

  // Extract Priority: !urgent, !high, !p1, !med, !p2, !low, !p3
  text = text.replace(/!(urgent|high|p1|med|medium|p2|low|p3)\b/gi, (_, p) => {
    const pl = p.toLowerCase();
    if (pl === 'urgent' || pl === 'high' || pl === 'p1') priority = 'high';
    else if (pl === 'med' || pl === 'medium' || pl === 'p2') priority = 'med';
    else if (pl === 'low' || pl === 'p3') priority = 'low';
    return '';
  });

  // Extract Tags: #tagname
  text = text.replace(/#([\w-]+)/g, (_, tag) => {
    tags.push(tag.toLowerCase());
    return '';
  });

  // Extract Student: @StudentName or matching existing student name
  let student = '';
  text = text.replace(/@([\w-]+)/g, (match, name) => {
    const q = name.toLowerCase();
    const matchedStudent = studentsList.find((s) => s.name && s.name.toLowerCase().replace(/\s+/g, '') === q);
    if (matchedStudent) {
      student = matchedStudent.name;
      return '';
    }
    const prj = projects.find((p) => p.name && p.name.toLowerCase().includes(q));
    if (prj) { projectId = prj.id; return ''; }
    const gl = goals.find((g) => g.title && g.title.toLowerCase().includes(q));
    if (gl) { goalId = gl.id; return ''; }
    return match;
  });

  // task 18: pre-compile regexes once per parse and skip fuzzy match if @token already resolved
  if (!student && studentsList.length) {
    const compiled = studentsList
      .filter((s) => s.name && s.name.length >= 3)
      .map((s) => ({ name: s.name, re: new RegExp(`\\b(?:with|for|student:)?\\s*${escapeRegExp(s.name)}\\b`, 'i') }));
    for (const { name, re } of compiled) {
      if (re.test(text)) {
        student = name;
        break;
      }
    }
  }

  // Extract Time: at 3pm, at 3:30pm, at 14:00, at 9am
  text = text.replace(/\bat\s+(\d{1,2})(?::(\d{2}))?\s*(am|pm)?\b/gi, (_, h, m, ampm) => {
    let hr = parseInt(h, 10);
    const mn = m ? m.padStart(2, '0') : '00';
    if (ampm) {
      const ap = ampm.toLowerCase();
      if (ap === 'pm' && hr < 12) hr += 12;
      if (ap === 'am' && hr === 12) hr = 0;
    }
    startTime = `${String(hr).padStart(2, '0')}:${mn}`;
    return '';
  });

  // Extract Dates: today, tomorrow, tonight, in X days, in X weeks, next monday/etc.
  const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  const shortDays = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];

  text = text.replace(/\bin\s+(\d+)\s*(days?|weeks?|d|w)\b/gi, (_, num, unit) => {
    const n = parseInt(num, 10);
    due = isoLocal(shift(today, unit.startsWith('w') ? n * 7 : n));
    return '';
  });

  if (!due) {
    text = text.replace(/\b(today|tonight)\b/gi, () => {
      due = todayIso;
      status = 'today';
      return '';
    });
  }
  if (!due) {
    text = text.replace(/\btomorrow\b/gi, () => {
      due = isoLocal(shift(today, 1));
      return '';
    });
  }

  if (!due) {
    text = text.replace(/\b(?:next|on|this)?\s*(sunday|monday|tuesday|wednesday|thursday|friday|saturday|sun|mon|tue|wed|thu|fri|sat)\b/gi, (match, dayName) => {
      const dn = dayName.toLowerCase();
      let targetDow = dayNames.indexOf(dn);
      if (targetDow === -1) targetDow = shortDays.indexOf(dn);
      if (targetDow !== -1) {
        const curDow = today.getDay();
        let diff = targetDow - curDow;
        if (diff <= 0) diff += 7;
        due = isoLocal(shift(today, diff));
        return '';
      }
      return match;
    });
  }

  if (!due) {
    text = text.replace(/\b(\d{4}-\d{2}-\d{2})\b/g, (_, dt) => {
      due = dt;
      return '';
    });
  }

  const title = text.replace(/\s+/g, ' ').trim();
  if (!title) return null;

  return {
    title,
    due,
    startTime,
    priority,
    tags,
    category: category || (student ? 'work' : 'personal'),
    goalId,
    projectId,
    student: student || undefined,
    status: due === todayIso ? 'today' : status,
  };
}
