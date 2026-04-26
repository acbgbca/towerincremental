export interface ConfirmDialogOptions {
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  id?: string;
}

export function showConfirmDialog(opts: ConfirmDialogOptions): Promise<boolean> {
  return new Promise((resolve) => {
    const existing = opts.id ? document.getElementById(opts.id) : null;
    if (existing) existing.remove();

    const overlay = document.createElement('div');
    if (opts.id) overlay.id = opts.id;
    overlay.className = 'confirm-dialog';
    overlay.style.cssText =
      'position:fixed;inset:0;z-index:300;background:rgba(0,0,0,0.7);' +
      'display:flex;align-items:center;justify-content:center;';

    const box = document.createElement('div');
    box.style.cssText =
      'background:#222;color:#fff;padding:24px 28px;border-radius:10px;' +
      'max-width:480px;display:flex;flex-direction:column;gap:18px;text-align:center;' +
      'box-shadow:0 6px 24px rgba(0,0,0,0.6);';

    const msg = document.createElement('p');
    msg.className = 'confirm-dialog-message';
    msg.style.cssText = 'margin:0;font-size:18px;line-height:1.4;';
    msg.textContent = opts.message;

    const btnRow = document.createElement('div');
    btnRow.style.cssText = 'display:flex;gap:12px;justify-content:center;';

    const cancelBtn = document.createElement('button');
    cancelBtn.className = 'confirm-dialog-cancel';
    cancelBtn.textContent = opts.cancelLabel ?? 'Cancel';
    cancelBtn.style.cssText = 'font-size:16px;padding:8px 20px;cursor:pointer;';

    const confirmBtn = document.createElement('button');
    confirmBtn.className = 'confirm-dialog-confirm';
    confirmBtn.textContent = opts.confirmLabel ?? 'Confirm';
    confirmBtn.style.cssText =
      'font-size:16px;padding:8px 20px;cursor:pointer;background:#c44;color:#fff;border:0;border-radius:4px;';

    const close = (result: boolean) => {
      overlay.remove();
      resolve(result);
    };
    cancelBtn.addEventListener('click', () => close(false));
    confirmBtn.addEventListener('click', () => close(true));

    btnRow.appendChild(cancelBtn);
    btnRow.appendChild(confirmBtn);
    box.appendChild(msg);
    box.appendChild(btnRow);
    overlay.appendChild(box);
    document.body.appendChild(overlay);
  });
}
