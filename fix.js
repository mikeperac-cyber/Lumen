const fs = require('fs');

const code = `
export function getKanbanLists() {
  if (!app.state.kanbanLists) {
    app.state.kanbanLists = [
      { id: 'backlog', title: 'Backlog', color: 'none' },
      { id: 'today', title: 'Today', color: 'none' },
      { id: 'done', title: 'Done', color: 'none' }
    ];
  }
  return app.state.kanbanLists;
}
export function addKanbanList(title) {
  const lists = getKanbanLists();
  lists.push({ id: app.uid(), title, color: 'none' });
  app.save();
  renderTasks();
}
export function renameKanbanList(id, title) {
  const lists = getKanbanLists();
  const list = lists.find(x => x.id === id);
  if (list) {
    list.title = title;
    app.save();
    renderTasks();
  }
}
export function deleteKanbanList(id) {
  if (['backlog', 'today', 'done'].includes(id)) {
    app.toast('Cannot delete default lists', 'error');
    return;
  }
  app.state.kanbanLists = getKanbanLists().filter(x => x.id !== id);
  app.state.tasks.forEach(t => {
    if (t.status === id) { t.status = 'backlog'; t.updatedAt = Date.now(); }
  });
  app.save();
  renderTasks();
}
export function ensureKanbanLists() {
  getKanbanLists();
}
`;

fs.appendFileSync('src/tasks/controller.js', code);
let src = fs.readFileSync('src/tasks/controller.js', 'utf8');
src = src.replace(/app\.getKanbanLists/g, 'getKanbanLists');
src = src.replace(/app\.addKanbanList/g, 'addKanbanList');
src = src.replace(/app\.renameKanbanList/g, 'renameKanbanList');
src = src.replace(/app\.deleteKanbanList/g, 'deleteKanbanList');
src = src.replace(/app\.ensureKanbanLists/g, 'ensureKanbanLists');
fs.writeFileSync('src/tasks/controller.js', src);

// Also remove from app.js arguments
let appSrc = fs.readFileSync('app.js', 'utf8');
appSrc = appSrc.replace('getKanbanLists,\n', '\n');
appSrc = appSrc.replace('addKanbanList, renameKanbanList, deleteKanbanList, currentView, closeModal', 'currentView, closeModal');
fs.writeFileSync('app.js', appSrc);
