/**
 * Disclosure-style dropdown: a button with aria-expanded controlling a panel.
 * Closes on Escape (returning focus to the trigger), outside click, and when
 * focus leaves the component.
 */
export function initDropdown(root, { onOpen } = {}) {
  const trigger = root.querySelector('.dropdown__trigger');
  const panel = document.getElementById(trigger.getAttribute('aria-controls'));

  const isOpen = () => trigger.getAttribute('aria-expanded') === 'true';

  function open() {
    trigger.setAttribute('aria-expanded', 'true');
    panel.hidden = false;
    onOpen?.(panel);
  }

  function close({ returnFocus = false } = {}) {
    if (!isOpen()) return;
    trigger.setAttribute('aria-expanded', 'false');
    panel.hidden = true;
    if (returnFocus) trigger.focus();
  }

  trigger.addEventListener('click', () => (isOpen() ? close() : open()));

  root.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && isOpen()) {
      event.stopPropagation();
      close({ returnFocus: true });
    }
  });

  root.addEventListener('focusout', (event) => {
    if (event.relatedTarget && !root.contains(event.relatedTarget)) close();
  });

  document.addEventListener('click', (event) => {
    if (!root.contains(event.target)) close();
  });

  return { open, close, isOpen };
}
