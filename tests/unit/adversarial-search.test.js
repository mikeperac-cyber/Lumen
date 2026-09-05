import { describe, it, expect } from 'vitest';
import { getSearchTasksHay } from '../../src/tasks/controller.js';
import { getSearchVaultHay, getVaultHay } from '../../src/vault/store.js';

describe('Adversarial Stress Test: Search Hay Indexing', () => {
  describe('getSearchTasksHay', () => {
    it('handles empty state and edge inputs gracefully', () => {
      expect(getSearchTasksHay([])).toEqual([]);
      expect(getSearchTasksHay()).toBeDefined();
    });

    it('handles tasks with missing, null, or undefined fields without throwing', () => {
      const edgeTasks = [
        {},
        { id: '1', title: null, desc: undefined, tags: null, comments: null, student: null },
        { id: '2', title: '', desc: '', tags: [], comments: [], student: '' },
        { id: '3', title: 123, desc: 456, tags: ['a', null, 789], comments: [{ text: null }, { text: 'c1' }, {}], student: 'std' },
        { id: '4', tags: undefined, comments: undefined }
      ];

      const res = getSearchTasksHay(edgeTasks);
      expect(res).toHaveLength(5);
      expect(res[0].hay).toBeDefined();
      expect(typeof res[0].hay).toBe('string');
      expect(res[1].hay.trim()).toBe('');
      expect(res[2].hay.trim()).toBe('');
      expect(res[3].hay).toContain('c1');
    });

    it('handles adversarial Unicode, control chars, RTL, and XSS payloads', () => {
      const xssPayloads = [
        '<script>alert("XSS")</script>',
        '"><svg onload=alert(1)>',
        '\\u0000\\u202E\\u200B\\uFEFF',
        '🚀🔥💡',
        'العربية עברית 測試',
        'SELECT * FROM tasks WHERE 1=1; DROP TABLE tasks; --',
        '${process.mainModule.require("child_process").execSync("whoami")}'
      ];

      const tasks = xssPayloads.map((payload, idx) => ({
        id: 't' + idx,
        title: payload,
        desc: payload,
        tags: [payload],
        comments: [{ text: payload }],
        student: payload,
        updatedAt: 1000 + idx
      }));

      const res = getSearchTasksHay(tasks);
      expect(res).toHaveLength(xssPayloads.length);
      for (const item of res) {
        expect(typeof item.hay).toBe('string');
        expect(item.hay.length).toBeGreaterThan(0);
      }
    });

    it('handles massive payload (10,000 tasks) with high performance', () => {
      const largeTasks = Array.from({ length: 10000 }, (_, i) => ({
        id: 'task_' + i,
        title: `Task number ${i} with substantial title keyword_${i % 100}`,
        desc: `Detailed description for task ${i} covering multiple paragraphs and edge cases. Priority: high.`,
        tags: [`tag_${i % 50}`, `cat_${i % 10}`, 'urgent'],
        comments: [{ text: `Comment on ${i}` }, { text: `Resolution notes for ${i}` }],
        student: `Student_${i % 30}`,
        updatedAt: 1700000000000 + i
      }));

      const start = performance.now();
      const res = getSearchTasksHay(largeTasks);
      const duration = performance.now() - start;

      expect(res).toHaveLength(10000);
      expect(duration).toBeLessThan(250); // Must be fast (<250ms in CI/stress environments)

      // Test cache hit
      const cacheStart = performance.now();
      const cachedRes = getSearchTasksHay(largeTasks);
      const cacheDuration = performance.now() - cacheStart;

      expect(cachedRes).toBe(res); // Same reference
      expect(cacheDuration).toBeLessThan(25); // Near-instantaneous (<25ms)
    });

    it('correctly invalidates cache when tasks are modified or added', () => {
      const t1 = { id: '1', title: 'First Task', updatedAt: 100 };
      const t2 = { id: '2', title: 'Second Task', updatedAt: 200 };
      let list = [t1, t2];

      const res1 = getSearchTasksHay(list);
      expect(res1[0].hay).toContain('first');

      // Adding item -> cache invalidates
      const t3 = { id: '3', title: 'Third Task', updatedAt: 300 };
      list = [t1, t2, t3];
      const res2 = getSearchTasksHay(list);
      expect(res2).not.toBe(res1);
      expect(res2).toHaveLength(3);

      // Updating timestamp -> cache invalidates
      t1.title = 'First Task Renamed';
      t1.updatedAt = 400;
      const res3 = getSearchTasksHay(list);
      expect(res3).not.toBe(res2);
      expect(res3[0].hay).toContain('renamed');
    });
  });

  describe('getSearchVaultHay and getVaultHay', () => {
    it('handles null, undefined, and empty objects', () => {
      expect(getVaultHay(null)).toBe('');
      expect(getVaultHay(undefined)).toBe('');
      expect(getVaultHay({})).toBe('');
      expect(getSearchVaultHay([])).toEqual([]);
    });

    it('indexes all relevant vault fields in lowercase', () => {
      const v = {
        title: 'Project Roadmap PDF',
        url: 'https://Example.com/Docs/Roadmap.pdf',
        description: 'CONFIDENTIAL Architecture Diagram',
        fileName: 'Roadmap_v2.PDF',
        tags: ['Planning', 'Q3-Goals']
      };

      const hay = getVaultHay(v);
      expect(hay).toContain('project roadmap pdf');
      expect(hay).toContain('https://example.com/docs/roadmap.pdf');
      expect(hay).toContain('confidential architecture diagram');
      expect(hay).toContain('roadmap_v2.pdf');
      expect(hay).toContain('planning q3-goals');
      expect(hay).toBe(hay.toLowerCase());
    });

    it('handles adversarial Unicode, XSS, and missing fields in vault items', () => {
      const edgeVaultItems = [
        {},
        { title: null, url: undefined, description: null, fileName: null, tags: null },
        { title: '<script>alert("Vault")</script>', description: '"><img>', tags: ['#hacked', '<tag>'] },
        { title: '🔒 Secret \u0000\u200B', description: 'Emoji test 📁📊', tags: ['🏷️'] }
      ];

      const res = getSearchVaultHay(edgeVaultItems);
      expect(res).toHaveLength(4);
      expect(res[0].hay).toBe('');
      expect(res[1].hay).toBe('');
      expect(res[2].hay).toContain('<script>alert("vault")</script>');
      expect(res[3].hay).toContain('🔒 secret');
    });

    it('handles massive vault payload (10,000 items) efficiently', () => {
      const largeVault = Array.from({ length: 10000 }, (_, i) => ({
        id: 'v_' + i,
        title: `Document ${i} Specification Guide`,
        url: `https://lumen.local/vault/doc_${i}.pdf`,
        description: `Full text summary for vault document item ${i}`,
        fileName: `file_spec_${i}.pdf`,
        tags: [`tag_${i % 20}`, 'vault', 'document'],
        size: 1024 * (i + 1)
      }));

      const start = performance.now();
      const res = getSearchVaultHay(largeVault);
      const duration = performance.now() - start;

      expect(res).toHaveLength(10000);
      expect(duration).toBeLessThan(100);
      expect(res[500].hay).toContain('document 500 specification guide');
    });
  });
});
