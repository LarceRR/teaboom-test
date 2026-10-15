(() => {
  'use strict';

  const packaging = [
    { weight: '100 г', article: '01306', price: 326.40, oldPrice: 349.20, stock: 24 },
    { weight: '500 г', article: '01307', price: 1432, oldPrice: 1646, stock: 12 },
    { weight: '1000 г', article: '01308', price: 2592, oldPrice: null, stock: 8 },
    { weight: '5000 г', article: '01309', price: 6320, oldPrice: 8710, stock: 0 },
  ];

  const money = (value) => new Intl.NumberFormat('ru-RU', {
    minimumFractionDigits: Number.isInteger(value) ? 0 : 2,
    maximumFractionDigits: 2,
  }).format(value) + ' ₽';

  const pluralize = (value, forms) => {
    const lastTwo = value % 100;
    const last = value % 10;
    if (lastTwo >= 11 && lastTwo <= 14) return forms[2];
    if (last === 1) return forms[0];
    if (last >= 2 && last <= 4) return forms[1];
    return forms[2];
  };

  const radios = [...document.querySelectorAll('input[name="packaging"]')];
  const sku = document.querySelector('#sku');
  const availabilityLine = document.querySelector('#availability-line');
  const availabilityLabel = document.querySelector('#availability-label');
  const purchaseArea = document.querySelector('.purchase-area');
  const currentPrice = document.querySelector('#current-price');
  const oldPrice = document.querySelector('#old-price');
  const savingSummary = document.querySelector('.saving-summary');
  const savingAmount = document.querySelector('#saving-amount');
  const buttonPrice = document.querySelector('#button-price');
  const quantityInput = document.querySelector('#quantity-value');
  const quantityMinus = document.querySelector('#quantity-minus');
  const quantityPlus = document.querySelector('#quantity-plus');
  const addButton = document.querySelector('#add-to-cart');
  const toast = document.querySelector('#toast');
  const imageDialog = document.querySelector('#image-dialog');
  const zoomButton = document.querySelector('#zoom-button');
  const closeDialog = document.querySelector('#dialog-close');

  let quantity = 1;
  let toastTimer = 0;
  let addButtonTimer = 0;
  let selectedIndex = 0;

  function showToast(message) {
    toast.textContent = message;
    toast.classList.add('is-visible');
    window.clearTimeout(toastTimer);
    toastTimer = window.setTimeout(() => toast.classList.remove('is-visible'), 3000);
  }

  function renderQuantity({ preserveInput = false } = {}) {
    const item = packaging[selectedIndex];
    const unavailable = item.stock <= 0;
    const maxQuantity = Math.max(1, Math.min(99, item.stock));

    quantityInput.min = '1';
    quantityInput.max = String(maxQuantity);
    if (!preserveInput) quantityInput.value = String(quantity);

    const rawValue = quantityInput.value.trim();
    const typedQuantity = Number(rawValue);
    const validQuantity = rawValue !== ''
      && Number.isInteger(typedQuantity)
      && typedQuantity >= 1
      && typedQuantity <= maxQuantity
      && !unavailable;

    if (validQuantity) quantity = typedQuantity;

    quantityMinus.disabled = unavailable || !validQuantity || quantity <= 1;
    quantityPlus.disabled = unavailable || !validQuantity || quantity >= maxQuantity;
    buttonPrice.textContent = money(item.price * (validQuantity ? typedQuantity : quantity));
    addButton.disabled = unavailable || !validQuantity;
    addButton.querySelector('.add-label').textContent = unavailable ? 'Нет в наличии' : 'В корзину';
    buttonPrice.hidden = unavailable;
    quantityInput.setAttribute('aria-invalid', String(!validQuantity));
  }

  function renderPackaging(index) {
    const item = packaging[index];
    // Unavailable sizes stay visible in the list, but can never become selected.
    if (!item || item.stock <= 0 || radios[index]?.disabled) return;

    selectedIndex = index;
    quantity = 1;
    window.clearTimeout(addButtonTimer);
    addButton.classList.remove('is-added');
    sku.textContent = item.article;
    currentPrice.textContent = money(item.price);

    const hasDiscount = Number.isFinite(item.oldPrice) && item.oldPrice > item.price;
    oldPrice.hidden = !hasDiscount;
    savingSummary.hidden = !hasDiscount;
    purchaseArea.classList.toggle('no-discount', !hasDiscount);
    if (hasDiscount) {
      oldPrice.textContent = money(item.oldPrice);
      savingAmount.textContent = money(item.oldPrice - item.price);
    }

    availabilityLine.classList.remove('is-unavailable');
    availabilityLabel.textContent = `В наличии: ${item.stock} ${pluralize(item.stock, ['упаковка', 'упаковки', 'упаковок'])}`;

    radios.forEach((radio, radioIndex) => {
      const label = radio.closest('.pack-option');
      const option = packaging[radioIndex];
      const unavailable = option.stock <= 0;
      radio.disabled = unavailable;
      radio.checked = radioIndex === index;
      label.classList.toggle('is-selected', radioIndex === index);
      label.classList.toggle('is-unavailable', unavailable);
      label.setAttribute('aria-label', `${option.weight}, артикул ${option.article}${unavailable ? ', нет в наличии' : `, в наличии ${option.stock} ${pluralize(option.stock, ['упаковка', 'упаковки', 'упаковок'])}`}`);
      label.setAttribute('aria-disabled', String(unavailable));
      if (unavailable) label.title = 'Нет в наличии';
      else label.removeAttribute('title');
    });

    renderQuantity();
  }

  radios.forEach((radio, index) => {
    if (packaging[index].stock <= 0) radio.disabled = true;
    radio.addEventListener('change', () => renderPackaging(index));
  });

  quantityInput.addEventListener('input', () => renderQuantity({ preserveInput: true }));
  quantityInput.addEventListener('change', () => {
    const stock = packaging[selectedIndex].stock;
    const maxQuantity = Math.max(1, Math.min(99, stock));
    const parsed = Number(quantityInput.value);
    quantity = Number.isFinite(parsed) && quantityInput.value.trim() !== ''
      ? Math.min(maxQuantity, Math.max(1, Math.floor(parsed)))
      : 1;
    renderQuantity();
  });

  quantityMinus.addEventListener('click', () => {
    quantity = Math.max(1, quantity - 1);
    renderQuantity();
  });

  quantityPlus.addEventListener('click', () => {
    quantity = Math.min(Math.min(99, packaging[selectedIndex].stock), quantity + 1);
    renderQuantity();
  });

  addButton.addEventListener('click', () => {
    const item = packaging[selectedIndex];
    renderQuantity({ preserveInput: true });
    if (!item || item.stock <= 0 || addButton.disabled) return;

    addButton.classList.add('is-added');
    addButton.querySelector('.add-label').textContent = 'Добавлено';
    showToast(`Добавлено в корзину: ${quantity} × ${item.weight} «Ананасовый улун».`);
    window.clearTimeout(addButtonTimer);
    addButtonTimer = window.setTimeout(() => {
      addButton.classList.remove('is-added');
      addButton.querySelector('.add-label').textContent = 'В корзину';
    }, 1600);
  });

  zoomButton.addEventListener('click', () => {
    if (typeof imageDialog.showModal === 'function') imageDialog.showModal();
  });

  closeDialog.addEventListener('click', () => imageDialog.close());
  imageDialog.addEventListener('click', (event) => {
    if (event.target === imageDialog) imageDialog.close();
  });

  renderPackaging(0);
})();
