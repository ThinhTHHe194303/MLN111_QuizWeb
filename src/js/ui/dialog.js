import { $ } from '../utils/dom.js';

let onConfirm = null;
const dialog = () => $('#confirm-dialog');

export function isDialogOpen() {
  return dialog().open;
}

export function closeDialog() {
  onConfirm = null;
  if (dialog().open) dialog().close();
}

export function confirmAction({ title, text, confirmLabel, cancelLabel = 'Hủy', danger = false, action }) {
  $('#dialog-title').textContent = title;
  $('#dialog-text').textContent = text;
  const ok = $('#dialog-ok');
  ok.textContent = confirmLabel;
  ok.classList.toggle('btn-danger', danger);
  ok.classList.toggle('btn-primary', !danger);
  $('#dialog-cancel').textContent = cancelLabel;
  onConfirm = action;
  dialog().showModal();
  $('#dialog-cancel').focus();
}

export function initDialog() {
  $('#dialog-cancel').addEventListener('click', closeDialog);
  $('#dialog-ok').addEventListener('click', () => {
    const action = onConfirm;
    closeDialog();
    action?.();
  });
  // Escape key: drop the pending action.
  dialog().addEventListener('cancel', () => { onConfirm = null; });
}
