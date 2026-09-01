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

const escapeRegExp = (str) => str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/**
 * Extract Priority: !urgent, !high, !p1, !med, !p2, !low, !p3
 * @param {string} text
 * @returns {{ text: string, priority: string }}
 */
export function extractPriority(text) {
  let priority = 'med';
  const cleanText = text.replace(/!(urgent|high|p1|med|medium|p2|low|p3)\b/gi, (_, p) => {
    const pl = p.toLowerCase();
    if (pl === 'urgent' || pl === 'high' || pl === 'p1') priority = 'high';
    else if (pl === 'med' || pl === 'medium' || pl === 'p2') priority = 'med';
    else if (pl === 'low' || pl === 'p3') priority = 'low';
    return '';
  });
  return { text: cleanText, priority };
}

/**
 * Extract Tags: #tagname
 * @param {string} text
 * @returns {{ text: string, tags: string[] }}
 */
export function extractTags(text) {
  const tags = [];
  const cleanText = text.replace(/#([\w-]+)/g, (_, tag) => {
    tags.push(tag.toLowerCase());
    return '';
  });
  return { text: cleanText, tags };
}

/**
 * Extract Student, Project, Goal: @Name or matching existing student name
 * @param {string} text
 * @param {{students?:{id:string,name:string}[],projects?:{id:string,name:string}[],goals?:{id:string,title:string}[]}} deps
 * @returns {{ text: string, student: string, projectId: string, goalId: string }}
 */
export function extractEntities(text, deps = {}) {
  const studentsList = deps.students || [];
  const projects = deps.projects || [];
  const goals = deps.goals || [];

  let student = '';
  let projectId = '';
  let goalId = '';

  let cleanText = text.replace(/@([\w-]+)/g, (match, name) => {
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

  // Fuzzy match student name if @token didn't resolve student
  if (!student && studentsList.length) {
    const compiled = studentsList
      .filter((s) => s.name && s.name.length >= 3)
      .map((s) => ({ name: s.name, re: new RegExp(`\\b(?:with|for|student:)?\\s*${escapeRegExp(s.name)}\\b`, 'i') }));
    for (const { name, re } of compiled) {
      if (re.test(cleanText)) {
        student = name;
        break;
      }
    }
  }

  return { text: cleanText, student, projectId, goalId };
}

/**
 * Extract Time: at 3pm, at 3:30pm, at 14:00, at 9am
 * @param {string} text
 * @returns {{ text: string, startTime: string }}
 */
export function extractTime(text) {
  let startTime = '';
  const cleanText = text.replace(/\bat\s+(\d{1,2})(?::(\d{2}))?\s*(am|pm)?\b/gi, (_, h, m, ampm) => {
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
  return { text: cleanText, startTime };
}

/**
 * Extract Dates: today, tomorrow, tonight, in X days, in X weeks, next monday/etc.
 * @param {string} text
 * @param {Date} today
 * @returns {{ text: string, due: string, status: string }}
 */
export function extractDate(text, today = new Date()) {
  const todayIso = isoLocal(today);
  let due = '';
  let status = 'backlog';
  let cleanText = text;

  const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  const shortDays = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];

  cleanText = cleanText.replace(/\bin\s+(\d+)\s*(days?|weeks?|d|w)\b/gi, (_, num, unit) => {
    const n = parseInt(num, 10);
    due = isoLocal(shift(today, unit.startsWith('w') ? n * 7 : n));
    return '';
  });

  if (!due) {
    cleanText = cleanText.replace(/\b(today|tonight)\b/gi, () => {
      due = todayIso;
      status = 'today';
      return '';
    });
  }
  if (!due) {
    cleanText = cleanText.replace(/\btomorrow\b/gi, () => {
      due = isoLocal(shift(today, 1));
      return '';
    });
  }

  if (!due) {
    cleanText = cleanText.replace(/\b(?:next|on|this)?\s*(sunday|monday|tuesday|wednesday|thursday|friday|saturday|sun|mon|tue|wed|thu|fri|sat)\b/gi, (match, dayName) => {
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
    cleanText = cleanText.replace(/\b(\d{4}-\d{2}-\d{2})\b/g, (_, dt) => {
      due = dt;
      return '';
    });
  }

  return { text: cleanText, due, status };
}

/**
 * @param {string} rawText
 * @param {{students?:{id:string,name:string}[],projects?:{id:string,name:string}[],goals?:{id:string,title:string}[],now?:Date}} [deps]
 * @returns {object|null}
 */
export function parseNaturalLanguageTask(rawText, deps) {
  const d = deps || {};
  const today = d.now || new Date();
  const todayIso = isoLocal(today);

  let text = String(rawText || '').trim();
  if (text.length > 500) text = text.slice(0, 500);
  if (!text) return null;

  const priorityRes = extractPriority(text);
  text = priorityRes.text;

  const tagsRes = extractTags(text);
  text = tagsRes.text;

  const entitiesRes = extractEntities(text, d);
  text = entitiesRes.text;

  const timeRes = extractTime(text);
  text = timeRes.text;

  const dateRes = extractDate(text, today);
  text = dateRes.text;

  const title = text.replace(/\s+/g, ' ').trim();
  if (!title) return null;

  const category = entitiesRes.student ? 'work' : 'personal';
  const due = dateRes.due;
  let status = dateRes.status;
  if (due === todayIso) {
    status = 'today';
  }

  return {
    title,
    due,
    startTime: timeRes.startTime,
    priority: priorityRes.priority,
    tags: tagsRes.tags,
    category,
    goalId: entitiesRes.goalId,
    projectId: entitiesRes.projectId,
    student: entitiesRes.student || undefined,
    status,
  };
}
