(function () {
  "use strict";

  var CAKE_FLAVORS = [
    "Hot Milk",
    "Yellow",
    "Strawberry",
    "Vanilla",
    "Chocolate",
    "Oreo",
    "Lemon",
    "7Up",
    "Pineapple Upside Down"
  ];
  var BUNDT_FLAVORS = ["7Up", "Lemon", "Pineapple Upside Down"];

  var PRICES = {
    cookie: { each: 2.5, dozen: 25 },
    cupcake: { each: 3.5, dozen: 35 },
    '8" Two-Layer Cake': 40,
    "9x13 Cake": 35,
    "Bundt Cake": 35,
    Brownies: { each: 2.5, dozen: 30 },
    "Cold Mint Pie": 30
  };

  var form = document.getElementById("order-form");
  if (!form) return;
  var cart = [];

  function fillFlavorSelect(select, flavors) {
    var current = select.value;
    select.innerHTML = "";
    var first = document.createElement("option");
    first.value = "";
    first.textContent = "Choose a flavor";
    select.appendChild(first);
    flavors.forEach(function (name) {
      var opt = document.createElement("option");
      opt.value = name;
      opt.textContent = name;
      select.appendChild(opt);
    });
    if (flavors.indexOf(current) !== -1) select.value = current;
  }

  function updateRow(row) {
    var type = row.getAttribute("data-item");
    var flavor = row.querySelector('[data-field="flavor"]');
    var nuts = row.querySelector("[data-nuts]");
    var shape = row.querySelector("[data-shape]");
    var cakeFlavor = row.querySelector("[data-cake-flavor]");
    var otherUnit = row.querySelector("[data-other-unit]");
    var typeSelect = row.querySelector('[data-field="type"]');
    var typeVal = typeSelect ? typeSelect.value : "";

    if (type === "cookie") {
      var showNuts = flavor && flavor.value === "Chocolate Chip";
      if (nuts) nuts.hidden = !showNuts;
      if (!showNuts && nuts) {
        var nsel = nuts.querySelector("select");
        if (nsel) nsel.value = "";
      }
    }

    if (type === "cake") {
      var isLayer = typeVal.indexOf("Two-Layer") !== -1;
      var isBundt = typeVal === "Bundt Cake";
      if (shape) shape.hidden = !isLayer;
      if (!isLayer && shape) {
        var ssel = shape.querySelector("select");
        if (ssel) ssel.value = "";
      }
      if (cakeFlavor) {
        cakeFlavor.hidden = !(isLayer || isBundt);
        var fsel = cakeFlavor.querySelector("select");
        if (fsel) {
          if (isLayer) fillFlavorSelect(fsel, CAKE_FLAVORS);
          else if (isBundt) fillFlavorSelect(fsel, BUNDT_FLAVORS);
          else {
            fsel.value = "";
          }
        }
      }
    }

    if (type === "other") {
      var needsNuts = typeVal === "Brownies" || typeVal === "Fudge";
      var needsUnit = typeVal === "Brownies";
      if (nuts) nuts.hidden = !needsNuts;
      if (!needsNuts && nuts) {
        var onsel = nuts.querySelector("select");
        if (onsel) onsel.value = "";
      }
      if (otherUnit) otherUnit.hidden = !needsUnit;
      if (!needsUnit && otherUnit) {
        var usel = otherUnit.querySelector("select");
        if (usel) usel.value = "each";
      }
    }
  }

  function uniqueName(base) {
    return base + "-" + Math.random().toString(36).slice(2, 8);
  }

  function addRow(fieldset) {
    var rows = fieldset.querySelector("[data-rows]");
    var first = rows.querySelector(".order-row");
    var clone = first.cloneNode(true);
    clone.querySelectorAll("select, input, textarea").forEach(function (el) {
      if (el.type === "number" || el.tagName === "TEXTAREA") el.value = "";
      else el.value = el.options && el.options.length ? "" : el.value;
      if (el.name) el.name = uniqueName(el.name.replace(/-[a-z0-9]{6}$/, ""));
    });
    var remove = clone.querySelector("[data-remove]");
    if (remove) remove.hidden = false;
    rows.appendChild(clone);
    updateRow(clone);
    var firstInput = clone.querySelector("select, input");
    if (firstInput) firstInput.focus();
    updateEstimate();
  }

  function money(n) {
    return "$" + n.toFixed(2).replace(/\.00$/, "");
  }

  function rowDescription(row) {
    var type = row.getAttribute("data-item");
    var get = function (field) {
      var el = row.querySelector('[data-field="' + field + '"]');
      return el ? el.value.trim() : "";
    };
    var qty = parseInt(get("qty"), 10);
    if (!qty) return null;

    var unit = get("unit") || "each";
    var flavor = get("flavor");
    var nuts = get("nuts");
    var shape = get("shape");
    var typ = get("type");
    var parts = [];
    var lineTotal = null;
    var priced = true;

    if (type === "cookie") {
      if (!flavor) return null;
      var cookieQty = unit === "dozen" ? (qty === 1 ? "1 dozen" : qty + " dozen") : String(qty);
      parts = [cookieQty, flavor, "cookies"];
      if (nuts) parts.push("(" + nuts + ")");
      var p = PRICES.cookie[unit];
      if (p) lineTotal = p * qty;
    } else if (type === "cupcake") {
      if (!flavor) return null;
      var cupQty = unit === "dozen" ? (qty === 1 ? "1 dozen" : qty + " dozen") : String(qty);
      parts = [cupQty, flavor, "cupcakes"];
      var cp = PRICES.cupcake[unit];
      if (cp) lineTotal = cp * qty;
    } else if (type === "cake") {
      if (!typ) return null;
      parts = [qty > 1 ? String(qty) : "1", typ];
      if (shape) parts.push("(" + shape + ")");
      if (flavor) parts.push("(" + flavor + ")");
      if (PRICES[typ]) lineTotal = PRICES[typ] * qty;
    } else if (type === "other") {
      if (!typ) return null;
      if (typ === "Brownies") {
        var bQty = unit === "dozen" ? (qty === 1 ? "1 dozen" : qty + " dozen") : String(qty);
        parts = [bQty, "brownies"];
        if (nuts) parts.push("(" + nuts + ")");
        var bp = PRICES.Brownies[unit];
        if (bp) lineTotal = bp * qty;
      } else if (typ.indexOf("Cold Mint Pie") === 0) {
        parts = [String(qty), "Cold Mint Pie (whole 9\")"];
        lineTotal = PRICES["Cold Mint Pie"] * qty;
      } else if (typ === "Fudge") {
        parts = [String(qty), "fudge"];
        if (nuts) parts.push("(" + nuts + ")");
        priced = false;
      }
    }

    if (!parts.length) return null;
    return {
      text: parts.join(" "),
      total: lineTotal,
      priced: priced,
      kind: type,
      fields: {
        flavor: flavor,
        nuts: nuts,
        shape: shape,
        type: typ,
        qty: String(qty),
        unit: unit
      }
    };
  }

  function updateEstimate() {
    var list = document.getElementById("estimate-lines");
    var totalEl = document.getElementById("estimate-total");
    var empty = document.getElementById("cart-empty");
    if (!list || !totalEl) return;
    list.innerHTML = "";
    if (empty) empty.hidden = cart.length > 0;
    var sum = 0;
    var hasUnpriced = false;
    cart.forEach(function (item, idx) {
      var li = document.createElement("li");
      var left = document.createElement("span");
      left.textContent = item.text;
      var right = document.createElement("span");
      right.className = "cart-right";
      var price = document.createElement("span");
      if (item.priced && item.total != null) {
        price.textContent = money(item.total);
        sum += item.total;
      } else {
        price.textContent = "Priced when you order";
        hasUnpriced = true;
      }
      var rm = document.createElement("button");
      rm.type = "button";
      rm.className = "cart-remove";
      rm.setAttribute("data-cart-remove", idx);
      rm.setAttribute("aria-label", "Remove " + item.text);
      rm.textContent = "Remove";
      right.appendChild(price);
      right.appendChild(rm);
      li.appendChild(left);
      li.appendChild(right);
      list.appendChild(li);
    });
    totalEl.hidden = cart.length === 0;
    totalEl.textContent = hasUnpriced
      ? "Estimated total: " + money(sum) + ", plus items priced when you order"
      : "Estimated total: " + money(sum);
    var fb = document.querySelector("[data-float-order]");
    if (fb) fb.textContent = cart.length ? "Your order (" + cart.length + ")" : "Order Now";
    checkMinimum();
  }

  // Delivery orders need a $25 minimum (menu prices, delivery fee not counted).
  // Single cookies are pickup only. Friendly heads-up only, it never blocks sending.
  var DELIVERY_MIN = 25;
  function checkMinimum() {
    var note = form.querySelector("[data-min-note]");
    if (!note) return;
    var selected = form.querySelector('input[name="fulfillment"]:checked');
    var v = selected && selected.value;
    var show = false;
    if (v === "Delivery" && cart.length) {
      var subtotal = 0;
      var hasUnpriced = false;
      cart.forEach(function (item) {
        if (item.priced && item.total != null) subtotal += item.total;
        else hasUnpriced = true;
      });
      show = !hasUnpriced && subtotal < DELIVERY_MIN;
    }
    note.hidden = !show;
  }

  function resetRow(row) {
    row.querySelectorAll("select, input").forEach(function (el) {
      if (el.getAttribute("data-field") === "qty") el.value = "1";
      else if (el.getAttribute("data-field") === "unit") el.value = "each";
      else if (el.tagName === "SELECT") el.value = "";
    });
    updateRow(row);
  }

  function addRowToCart(row) {
    var desc = rowDescription(row);
    if (!desc) return null;
    cart.push(desc);
    resetRow(row);
    return desc;
  }

  form.addEventListener("click", function (e) {
    var addBtn = e.target.closest("[data-add-to-order]");
    if (addBtn) {
      var fs = addBtn.closest("fieldset");
      var msg = fs.querySelector("[data-add-msg]");
      var added = 0, last = null, failed = false;
      fs.querySelectorAll(".order-row").forEach(function (row) {
        var d = addRowToCart(row);
        if (d) { added++; last = d; } else failed = true;
      });
      if (added) {
        msg.className = "add-msg ok";
        msg.textContent = "Added to your order: " + last.text + ". Add more, or scroll down to finish.";
        updateEstimate();
        var cartBox = document.getElementById("estimate");
        cartBox.classList.remove("order-flash"); void cartBox.offsetWidth; cartBox.classList.add("order-flash");
      } else {
        msg.className = "add-msg err";
        msg.textContent = "Please choose a flavor or item and a quantity first.";
      }
      return;
    }
    var rmBtn = e.target.closest("[data-cart-remove]");
    if (rmBtn) {
      cart.splice(parseInt(rmBtn.getAttribute("data-cart-remove"), 10), 1);
      updateEstimate();
    }
  });

  function gatherBody() {
    var lines = ["Hello SweetWalks,", "", "I would like to place an order:", ""];
    cart.forEach(function (desc) {
      lines.push("• " + desc.text + (desc.total != null ? " (" + money(desc.total) + ")" : ""));
    });
    var custom = (form.elements.custom && form.elements.custom.value || "").trim();
    if (custom) {
      lines.push("");
      lines.push("Custom request:");
      lines.push(custom);
    }
    if (lines.length === 4) {
      // only header, no items
    }
    var fulfillment = (form.querySelector('input[name="fulfillment"]:checked') || {}).value || "";
    var area = (form.elements["delivery-area"] && form.elements["delivery-area"].value || "").trim();
    lines.push("");
    lines.push("Fulfillment: " + fulfillment);
    if (fulfillment === "Delivery" && area) lines.push("Delivery address: " + area);
    function val(n) { return (form.elements[n] && form.elements[n].value || "").trim(); }
    lines.push("");
    lines.push("Customer information:");
    lines.push("Name: " + val("name"));
    lines.push("Phone: " + val("phone"));
    if (val("email")) lines.push("Email: " + val("email"));
    lines.push("Date needed: " + val("date-needed"));
    lines.push("Time slot: " + val("time-slot"));
    var notes = (form.elements.notes && form.elements.notes.value || "").trim();
    if (notes) {
      lines.push("");
      lines.push("Notes:");
      lines.push(notes);
    }
    lines.push("");
    lines.push("Thank you!");
    return lines.join("\r\n");
  }

  form.addEventListener("click", function (e) {
    var add = e.target.closest("[data-add]");
    if (add) {
      addRow(add.closest("fieldset"));
      return;
    }
    var remove = e.target.closest("[data-remove]");
    if (remove) {
      var row = remove.closest(".order-row");
      var rows = row.parentElement.querySelectorAll(".order-row");
      if (rows.length > 1) {
        row.remove();
        updateEstimate();
      }
    }
  });

  form.addEventListener("change", function (e) {
    var row = e.target.closest(".order-row");
    if (row) updateRow(row);
    var delivery = form.querySelector("[data-delivery-area]");
    if (delivery) {
      var selected = form.querySelector('input[name="fulfillment"]:checked');
      var v = selected && selected.value;
      delivery.hidden = v !== "Delivery";
      delivery.querySelector("textarea").required = !delivery.hidden;
    }
    updateEstimate();
  });

  form.addEventListener("input", function (e) {
    if (e.target.matches('[data-field="qty"]')) updateEstimate();
  });

  function prepareOrder() {
    form.querySelectorAll(".order-row").forEach(function (row) {
      var d = rowDescription(row);
      var main = row.querySelector('[data-field="type"], [data-field="flavor"]');
      if (d && main && main.value) addRowToCart(row);
    });
    updateEstimate();
    var customText = (form.elements.custom && form.elements.custom.value || "").trim();
    if (!cart.length && !customText) {
      var first = form.querySelector("[data-add-msg]");
      first.className = "add-msg err";
      first.textContent = "Your order is empty. Pick a dessert and tap \"Add to order\" first.";
      first.closest("fieldset").scrollIntoView({ behavior: "smooth", block: "start" });
      return null;
    }
    return gatherBody();
  }

  function copyText(text) {
    function fallback() {
      var ta = document.createElement("textarea");
      ta.value = text;
      ta.setAttribute("readonly", "");
      ta.style.position = "fixed";
      ta.style.top = "0";
      ta.style.left = "-9999px";
      document.body.appendChild(ta);
      ta.focus();
      ta.select();
      ta.setSelectionRange(0, ta.value.length);
      var ok = false;
      try { ok = document.execCommand("copy"); } catch (err) {}
      document.body.removeChild(ta);
      return ok;
    }
    if (navigator.clipboard && navigator.clipboard.writeText) {
      return navigator.clipboard.writeText(text).then(function () {
        return true;
      }).catch(function () {
        return fallback();
      });
    }
    return Promise.resolve(fallback());
  }

  function showIgNotice(ok, text) {
    var notice = form.querySelector("[data-ig-notice]");
    var fallback = form.querySelector("[data-ig-copy-text]");
    if (notice) {
      notice.hidden = false;
      notice.className = "ig-copy-notice " + (ok ? "ok" : "err");
      notice.textContent = ok
        ? "Order copied! Paste it in the Instagram chat and send."
        : "We couldn't copy automatically. Copy the order below, paste it in the Instagram chat, and send.";
    }
    if (fallback) {
      fallback.hidden = ok;
      fallback.textContent = ok ? "" : text;
    }
  }

  function showNextSteps() {
    var box = form.querySelector("[data-next-steps]");
    if (!box) return;
    var txt = box.querySelector("[data-next-steps-text]");
    if (txt) txt.textContent = "Once you send your order request, we'll text you within 24 hours to confirm your total and deposit.";
    box.classList.remove("is-sent");
    void box.offsetWidth;
    box.classList.add("is-sent");
  }

  form.addEventListener("submit", function (e) {
    e.preventDefault();
    var body = prepareOrder();
    if (!body) return;
    saveRememberedOrder();
    showNextSteps();
    if (window.swEmailChooser) window.swEmailChooser("Order request", body);
  });

  var igBtn = form.querySelector("[data-order-instagram]");
  if (igBtn) {
    igBtn.addEventListener("click", function () {
      if (typeof form.reportValidity === "function" && !form.reportValidity()) return;
      var body = prepareOrder();
      if (!body) return;
      saveRememberedOrder();
      showNextSteps();
      copyText(body).then(function (ok) {
        showIgNotice(ok, body);
        window.open("https://ig.me/m/sweetwalks_bake", "_blank", "noopener,noreferrer");
      });
    });
  }

  form.querySelectorAll(".order-row").forEach(updateRow);

  function syncChoices() {
    form.querySelectorAll(".choice").forEach(function (label) {
      var input = label.querySelector("input");
      label.classList.toggle("is-checked", !!(input && input.checked));
    });
  }
  form.addEventListener("change", function (e) {
    if (e.target && e.target.closest && e.target.closest(".choice")) syncChoices();
  });
  syncChoices();

  // Order buttons on menu items: jump to the form with that item picked
  document.addEventListener("click", function (e) {
    var link = e.target.closest("[data-order]");
    if (!link) return;
    e.preventDefault();
    var kind = link.getAttribute("data-order");
    var target;
    if (kind === "custom") {
      var custom = form.elements.custom;
      target = custom.closest("fieldset");
      target.scrollIntoView({ behavior: "smooth", block: "start" });
      setTimeout(function () { try { custom.focus({ preventScroll: true }); } catch (err) { custom.focus(); } }, 500);
    } else {
      target = form.querySelector('fieldset[data-repeat="' + kind + '"]');
      if (!target) return;
      var rows = target.querySelectorAll(".order-row");
      var row = rows[rows.length - 1];
      var main = row.querySelector('[data-field="type"], [data-field="flavor"]');
      if (main && main.value) resetRow(row);
      var sets = (link.getAttribute("data-set") || "").split(";").filter(Boolean);
      var unit = row.querySelector('[data-field="unit"]');
      if (unit && !unit.value) unit.value = "each";
      var order = ["type", "shape", "unit"];
      sets.sort(function (a, b) { return order.indexOf(a.split("=")[0]) - order.indexOf(b.split("=")[0]); });
      sets.forEach(function (pair) {
        var k = pair.split("=")[0], v = pair.slice(k.length + 1);
        var el = row.querySelector('[data-field="' + k + '"]');
        if (!el) return;
        el.value = v;
        el.dispatchEvent(new Event("change", { bubbles: true }));
      });
      updateRow(row);
      updateEstimate();
      target.scrollIntoView({ behavior: "smooth", block: "start" });
      var focusEl = row.querySelector("select:not([hidden])");
      var empty = Array.prototype.find.call(row.querySelectorAll("select"), function (sel) {
        return !sel.value && !sel.closest("[hidden]");
      });
      setTimeout(function () { var toFocus = empty || focusEl || row; try { toFocus.focus({ preventScroll: true }); } catch (err) { toFocus.focus(); } }, 500);
    }
    target.classList.remove("order-flash");
    void target.offsetWidth;
    target.classList.add("order-flash");
  });

  // Floating Order Now button: hide at the top of the page and while the form is on screen
  var floatBtn = document.querySelector("[data-float-order]");
  var orderSection = document.getElementById("order");
  if (floatBtn && "IntersectionObserver" in window) {
    var hideFloat = { order: false, hero: true };
    var syncFloat = function () {
      floatBtn.classList.toggle("is-hidden", hideFloat.order || hideFloat.hero);
    };
    if (orderSection) {
      new IntersectionObserver(function (entries) {
        hideFloat.order = entries[0].isIntersecting;
        syncFloat();
      }, { threshold: 0.05 }).observe(orderSection);
    }
    var hero = document.querySelector(".hero");
    if (hero) {
      // Hide the button while any of the hero is in the main view so it does not cover CTAs or text
      new IntersectionObserver(function (entries) {
        hideFloat.hero = entries[0].isIntersecting;
        syncFloat();
      }, { threshold: 0, rootMargin: "-80px 0px -90px 0px" }).observe(hero);
    } else {
      hideFloat.hero = false;
      syncFloat();
    }
  }

  var dateInput = form.elements["date-needed"];
  if (dateInput) {
    var t = new Date();
    var mm = String(t.getMonth() + 1);
    var dd = String(t.getDate());
    if (mm.length < 2) mm = "0" + mm;
    if (dd.length < 2) dd = "0" + dd;
    dateInput.min = t.getFullYear() + "-" + mm + "-" + dd;
    if (dateInput.type !== "date") {
      dateInput.setAttribute("placeholder", "YYYY-MM-DD");
      dateInput.setAttribute("pattern", "\\d{4}-\\d{2}-\\d{2}");
      dateInput.setAttribute("title", "Enter the date as YYYY-MM-DD");
      dateInput.setAttribute("inputmode", "numeric");
    }
  }
  updateEstimate();
  var deliveryInit = form.querySelector("[data-delivery-area]");
  if (deliveryInit) {
    var initSel = form.querySelector('input[name="fulfillment"]:checked');
    var initV = initSel && initSel.value;
    deliveryInit.hidden = initV !== "Delivery";
    deliveryInit.querySelector("textarea").required = !deliveryInit.hidden;
  }

  var SAVED_KEY = "sweetwalks-saved";
  var PICKUP_VALUE = "Pickup at 2801 Arden Way, Sacramento";
  // Older saves used "Pickup in Sacramento" or "Meet up"; both are now pickup at Arden Way.
  function normalizeFulfillment(v) {
    if (v === "Pickup in Sacramento" || v === "Meet up") return PICKUP_VALUE;
    return v;
  }
  var REORDER_DISMISS = "sw-reorder-dismissed";

  function readSaved() {
    try {
      var raw = localStorage.getItem(SAVED_KEY);
      if (!raw) return null;
      var data = JSON.parse(raw);
      if (!data || typeof data !== "object") return null;
      // Older saves may carry fields the form no longer has (payment method, free-text time).
      if (data.contact && typeof data.contact === "object") {
        delete data.contact.payment;
        if (data.contact.fulfillment) {
          data.contact.fulfillment = normalizeFulfillment(data.contact.fulfillment);
          if (data.contact.fulfillment !== "Delivery") data.contact.deliveryArea = "";
        }
      }
      if (data.lastOrder && typeof data.lastOrder === "object") {
        delete data.lastOrder.payment;
        delete data.lastOrder.timeNeeded;
      }
      return data;
    } catch (err) {
      return null;
    }
  }

  function writeSaved(data) {
    try { localStorage.setItem(SAVED_KEY, JSON.stringify(data)); } catch (err) {}
  }

  function clearSaved() {
    try { localStorage.removeItem(SAVED_KEY); } catch (err) {}
    try { sessionStorage.removeItem(REORDER_DISMISS); } catch (err) {}
  }

  function valOf(name) {
    return (form.elements[name] && form.elements[name].value || "").trim();
  }

  function collectContact() {
    var fulfillment = (form.querySelector('input[name="fulfillment"]:checked') || {}).value || "";
    return {
      name: valOf("name"),
      phone: valOf("phone"),
      email: valOf("email"),
      fulfillment: fulfillment,
      deliveryArea: valOf("delivery-area")
    };
  }

  function applyContact(contact) {
    if (!contact) return;
    function setVal(name, value) {
      if (!value || !form.elements[name]) return;
      form.elements[name].value = value;
    }
    setVal("name", contact.name);
    setVal("phone", contact.phone);
    setVal("email", contact.email);
    if (contact.fulfillment) {
      form.querySelectorAll('input[name="fulfillment"]').forEach(function (radio) {
        radio.checked = radio.value === contact.fulfillment;
      });
      var checked = form.querySelector('input[name="fulfillment"]:checked');
      if (checked) checked.dispatchEvent(new Event("change", { bubbles: true }));
    }
    setVal("delivery-area", contact.deliveryArea);
  }

  function clearContactFields() {
    ["name", "phone", "email", "delivery-area"].forEach(function (name) {
      if (form.elements[name]) form.elements[name].value = "";
    });
    var pickup = form.querySelector('input[name="fulfillment"][value="' + PICKUP_VALUE + '"]');
    if (pickup) {
      pickup.checked = true;
      pickup.dispatchEvent(new Event("change", { bubbles: true }));
    }
  }

  function lastOrderFrom(data) {
    return data && data.lastOrder && typeof data.lastOrder === "object" ? data.lastOrder : null;
  }

  function hasLastOrder(data) {
    var last = lastOrderFrom(data);
    if (!last) return false;
    var items = last.items || [];
    return items.length > 0 || !!(last.custom && String(last.custom).trim());
  }

  function updateClearLink() {
    var link = form.querySelector("[data-clear-saved]");
    if (!link) return;
    var data = readSaved();
    var show = !!(data && (data.contact || hasLastOrder(data)));
    link.hidden = !show;
  }

  var reorderCard = document.querySelector("[data-reorder-card]");

  function hideReorderCard() {
    if (reorderCard) reorderCard.hidden = true;
  }

  function renderReorderCard(data) {
    if (!reorderCard || !hasLastOrder(data)) {
      hideReorderCard();
      return;
    }
    var dismissed = false;
    try { dismissed = sessionStorage.getItem(REORDER_DISMISS) === "1"; } catch (err) {}
    if (dismissed) {
      hideReorderCard();
      return;
    }
    var list = reorderCard.querySelector("[data-reorder-list]");
    var last = lastOrderFrom(data);
    list.innerHTML = "";
    (last.items || []).forEach(function (item) {
      if (!item || !item.text) return;
      var li = document.createElement("li");
      li.textContent = item.text;
      list.appendChild(li);
    });
    if (last.custom && String(last.custom).trim()) {
      var customLi = document.createElement("li");
      customLi.textContent = "Custom request: " + String(last.custom).trim();
      list.appendChild(customLi);
    }
    if (last.timeSlot && list.children.length) {
      var slotLi = document.createElement("li");
      slotLi.textContent = "Time slot: " + last.timeSlot;
      list.appendChild(slotLi);
    }
    reorderCard.hidden = list.children.length === 0;
  }

  function setRowField(row, name, value) {
    if (value == null || value === "") return;
    var el = row.querySelector('[data-field="' + name + '"]');
    if (!el) return;
    el.value = String(value);
    el.dispatchEvent(new Event("change", { bubbles: true }));
  }

  function restoreCartItem(saved) {
    if (!saved || !saved.kind) return false;
    var fs = form.querySelector('fieldset[data-repeat="' + saved.kind + '"]');
    if (!fs) return false;
    var row = fs.querySelector(".order-row");
    if (!row) return false;
    resetRow(row);
    var fields = saved.fields || {};
    setRowField(row, "type", fields.type);
    setRowField(row, "shape", fields.shape);
    setRowField(row, "flavor", fields.flavor);
    setRowField(row, "nuts", fields.nuts);
    setRowField(row, "unit", fields.unit);
    setRowField(row, "qty", fields.qty);
    updateRow(row);
    return !!addRowToCart(row);
  }

  function saveRememberedOrder() {
    var box = form.elements["remember-info"];
    if (box && !box.checked) {
      clearSaved();
      hideReorderCard();
      updateClearLink();
      return;
    }
    var items = cart.map(function (item) {
      return {
        kind: item.kind,
        text: item.text,
        total: item.total,
        priced: item.priced,
        fields: item.fields || {}
      };
    });
    writeSaved({
      contact: collectContact(),
      lastOrder: {
        items: items,
        custom: valOf("custom"),
        timeSlot: valOf("time-slot")
      }
    });
    updateClearLink();
  }

  var saved = readSaved();
  if (saved && saved.contact) applyContact(saved.contact);
  renderReorderCard(saved);
  updateClearLink();

  var clearBtn = form.querySelector("[data-clear-saved]");
  if (clearBtn) {
    clearBtn.addEventListener("click", function () {
      clearSaved();
      clearContactFields();
      hideReorderCard();
      updateClearLink();
    });
  }

  if (reorderCard) {
    var againBtn = reorderCard.querySelector("[data-reorder-again]");
    var newBtn = reorderCard.querySelector("[data-reorder-new]");
    if (againBtn) {
      againBtn.addEventListener("click", function () {
        var data = readSaved();
        if (!hasLastOrder(data)) return;
        cart = [];
        var last = lastOrderFrom(data);
        (last.items || []).forEach(restoreCartItem);
        if (form.elements.custom) form.elements.custom.value = last.custom || "";
        var slotSel = form.elements["time-slot"];
        if (slotSel && last.timeSlot) {
          var okSlot = Array.prototype.some.call(slotSel.options, function (o) { return o.value === last.timeSlot; });
          if (okSlot) slotSel.value = last.timeSlot;
        }
        updateEstimate();
        var cartBox = document.getElementById("estimate");
        if (cartBox) {
          cartBox.classList.remove("order-flash");
          void cartBox.offsetWidth;
          cartBox.classList.add("order-flash");
          cartBox.scrollIntoView({ behavior: "smooth", block: "start" });
        }
      });
    }
    if (newBtn) {
      newBtn.addEventListener("click", function () {
        try { sessionStorage.setItem(REORDER_DISMISS, "1"); } catch (err) {}
        cart = [];
        updateEstimate();
        hideReorderCard();
      });
    }
  }
})();

// Email chooser: lets visitors send with Gmail, Outlook, Yahoo, their mail app, or copy the address
(function () {
  var ADDR = "KCwalks@thesweetwalks.com";
  var modal = document.createElement("div");
  modal.className = "email-chooser";
  modal.hidden = true;
  modal.setAttribute("role", "dialog");
  modal.setAttribute("aria-modal", "true");
  modal.setAttribute("aria-label", "Choose how to email us");
  modal.innerHTML =
    '<div class="email-chooser-box">' +
    '<button type="button" class="email-chooser-close" aria-label="Close">&times;</button>' +
    "<h3>Email us</h3>" +
    '<p class="email-chooser-addr">' + ADDR + "</p>" +
    '<div class="email-chooser-options">' +
    '<a class="btn" data-mail="gmail" target="_blank" rel="noopener noreferrer">Gmail</a>' +
    '<a class="btn" data-mail="outlook" target="_blank" rel="noopener noreferrer">Outlook</a>' +
    '<a class="btn" data-mail="yahoo" target="_blank" rel="noopener noreferrer">Yahoo Mail</a>' +
    '<a class="btn" data-mail="app">Phone or computer mail app</a>' +
    '<button type="button" class="btn" data-mail="copy">Copy email address</button>' +
    "</div>" +
    '<p class="email-chooser-note" aria-live="polite"></p>' +
    "</div>";
  document.body.appendChild(modal);
  var note = modal.querySelector(".email-chooser-note");
  var current = { subject: "", body: "" };

  function enc(v) { return encodeURIComponent(v || ""); }
  function setLinks() {
    var su = current.subject, bo = current.body;
    modal.querySelector('[data-mail="gmail"]').href =
      "https://mail.google.com/mail/?view=cm&fs=1&to=" + enc(ADDR) + "&su=" + enc(su) + "&body=" + enc(bo);
    modal.querySelector('[data-mail="outlook"]').href =
      "https://outlook.live.com/mail/0/deeplink/compose?to=" + enc(ADDR) + "&subject=" + enc(su) + "&body=" + enc(bo);
    modal.querySelector('[data-mail="yahoo"]').href =
      "https://compose.mail.yahoo.com/?to=" + enc(ADDR) + "&subject=" + enc(su) + "&body=" + enc(bo);
    var q = [];
    if (su) q.push("subject=" + enc(su));
    if (bo) q.push("body=" + enc(bo));
    modal.querySelector('[data-mail="app"]').href = "mailto:" + ADDR + (q.length ? "?" + q.join("&") : "");
  }
  function open(subject, body) {
    current.subject = subject || "";
    current.body = body || "";
    note.textContent = "";
    setLinks();
    modal.hidden = false;
    var first = modal.querySelector('[data-mail="gmail"]');
    if (first) first.focus();
  }
  function close() { modal.hidden = true; }
  window.swEmailChooser = open;

  modal.addEventListener("click", function (e) {
    if (e.target === modal || e.target.closest(".email-chooser-close")) { close(); return; }
    var copyBtn = e.target.closest('[data-mail="copy"]');
    if (copyBtn) {
      var text = ADDR;
      var done = function (ok) {
        note.textContent = ok ? "Email address copied." : "Our email is " + ADDR;
      };
      function fallbackCopy() {
        var ta = document.createElement("textarea");
        ta.value = text;
        ta.setAttribute("readonly", "");
        ta.style.position = "fixed";
        ta.style.top = "0";
        ta.style.left = "-9999px";
        document.body.appendChild(ta);
        ta.focus();
        ta.select();
        ta.setSelectionRange(0, ta.value.length);
        var ok = false;
        try { ok = document.execCommand("copy"); } catch (err) {}
        document.body.removeChild(ta);
        done(ok);
      }
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text).then(function () { done(true); }, function () { fallbackCopy(); });
      } else { fallbackCopy(); }
    }
  });
  document.addEventListener("keydown", function (e) { if (e.key === "Escape" && !modal.hidden) close(); });

  document.addEventListener("click", function (e) {
    var a = e.target.closest('a[href^="mailto:"]');
    if (!a || modal.contains(a)) return;
    e.preventDefault();
    var href = a.getAttribute("href");
    var qs = href.split("?")[1] || "";
    var subject = "", body = "";
    qs.split("&").forEach(function (p) {
      var kv = p.split("=");
      if (kv[0] === "subject") subject = decodeURIComponent(kv[1] || "");
      if (kv[0] === "body") body = decodeURIComponent(kv[1] || "");
    });
    open(subject, body);
  });
})();


// Hide Thanksgiving cutoff after Sunday, Nov 22, 2026, 11:59 PM Pacific.
// The message stays visible if JavaScript is off.
(function () {
  function pastCutoff() {
    try {
      var parts = new Intl.DateTimeFormat("en-US", {
        timeZone: "America/Los_Angeles",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hourCycle: "h23"
      }).formatToParts(new Date());
      var g = {};
      parts.forEach(function (p) { g[p.type] = p.value; });
      return (g.year + g.month + g.day + g.hour + g.minute + g.second) > "20261122235959";
    } catch (e) {
      return Date.now() > Date.parse("2026-11-22T23:59:59-08:00");
    }
  }
  if (!pastCutoff()) return;
  document.documentElement.classList.add("promo-hidden", "thanks-cutoff-passed");
  var nodes = document.querySelectorAll("[data-thanks-cutoff], [data-thanks-cutoff-banner]");
  for (var i = 0; i < nodes.length; i++) nodes[i].hidden = true;
})();

// Holiday promo banner dismiss (same visit only)
(function () {
  var banner = document.querySelector("[data-promo-banner]");
  var btn = document.querySelector("[data-promo-dismiss]");
  if (!banner || !btn) return;
  btn.addEventListener("click", function () {
    banner.hidden = true;
    document.documentElement.classList.add("promo-hidden");
    try { sessionStorage.setItem("sw-promo-dismissed-2026-thanks", "1"); } catch (e) {}
  });
})();


// Compact header menu (phones, tablets, and small laptops)
(function () {
  var header = document.querySelector(".site-header");
  var btn = document.querySelector(".nav-toggle");
  var nav = document.getElementById("site-nav");
  if (!header || !btn || !nav) return;

  function setOpen(open) {
    header.classList.toggle("nav-open", open);
    document.body.classList.toggle("nav-open", open);
    btn.setAttribute("aria-expanded", open ? "true" : "false");
    btn.setAttribute("aria-label", open ? "Close menu" : "Open menu");
  }

  btn.addEventListener("click", function (e) {
    e.stopPropagation();
    setOpen(!header.classList.contains("nav-open"));
  });
  nav.addEventListener("click", function (e) {
    if (e.target.closest("a")) setOpen(false);
  });
  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape") setOpen(false);
  });
  document.addEventListener("click", function (e) {
    if (header.classList.contains("nav-open") && !header.contains(e.target)) setOpen(false);
  });
  window.addEventListener("resize", function () {
    if (window.matchMedia("(min-width: 1100px)").matches) setOpen(false);
  });
})();


// Register the service worker so Android Chrome can offer "Install app".
// Network-first in sw.js, so online visitors always get the current pages.
(function () {
  if (!("serviceWorker" in navigator)) return;
  var host = location.hostname;
  var secure = location.protocol === "https:" || host === "localhost" || host === "127.0.0.1";
  if (!secure) return;
  window.addEventListener("load", function () {
    navigator.serviceWorker.register("/sw.js").catch(function () {});
  });
})();
