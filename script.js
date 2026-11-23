(function () {
  "use strict";

  var form = document.getElementById("order-form");
  if (!form) return;

  // FormSubmit sends every order to the business inbox, with a CC copy.
  var ORDER_ENDPOINT = "https://formsubmit.co/ajax/KCwalks@thesweetwalks.com";
  var ORDER_CC = "chancewalkk01@gmail.com";
  // Optional backup log: paste the Google Apps Script web app URL here
  // (see order-log-apps-script.gs). Leave empty to turn it off.
  var SHEET_URL = "https://script.google.com/macros/s/AKfycbwTlKMBPkfOh3PLbOPy936-IWHDynR3y-kCzQp4--BmXrnWxTvLiJ6wWvDcTBC4p57Xjw/exec";
  var PHONE_DISPLAY = "(916) 720-9564";
  var PHONE_SMS = "sms:+19167209564";
  var PICKUP_VALUE = "Pickup at 2801 Arden Way, Sacramento";
  var PICKUP_OTHER_VALUE = "Pickup (other)";
  var PICKUP_SLOTS = ["8–9 AM", "9–10 AM", "10–11 AM", "11 AM–12 PM", "12–1 PM", "1–2 PM", "2–3 PM", "3–4 PM", "4–5 PM", "5–6 PM", "6–7 PM", "7–8 PM"];
  var DELIVERY_SLOTS = ["8–11 AM", "11 AM–2 PM", "2–5 PM", "5–8 PM"];
  var DELIVERY_MIN = 25;
  var CAKE_SHAPES = ["Round", "Heart", "Pumpkin"];
  var CAKE_FLAVORS = ["Hot Milk", "Yellow", "Strawberry", "Vanilla", "Chocolate", "Oreo", "Lemon", "7Up", "Pineapple Upside Down"];
  var MAX_QTY = 240;

  function money(n) { return "$" + n.toFixed(2).replace(/\.00$/, ""); }
  function val(n) { return (form.elements[n] && form.elements[n].value || "").trim(); }
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); }

  // ---- Dates spelled out: "Sunday, November 22, 2026" ----
  function parseISO(v) {
    var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(v || "");
    if (!m) return null;
    var d = new Date(+m[1], +m[2] - 1, +m[3]);
    return isNaN(d) ? null : d;
  }
  function spellDate(v) {
    var d = parseISO(v);
    if (!d) return v || "";
    return d.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" });
  }

  // ---- Build a stepper in every menu item row ----
  var rows = Array.prototype.slice.call(form.querySelectorAll(".item-row"));
  // The menu rows are already written in index.html (so they show even if
  // this script never runs). Only build a row here if it is still empty.
  rows.forEach(function (row) {
    var dozenAttr = parseFloat(row.getAttribute("data-dozen"));
    if (row.querySelector(".qty")) {
      if (isNaN(dozenAttr)) row.classList.remove("has-dozen"); else row.classList.add("has-dozen");
      if (isNaN(parseFloat(row.getAttribute("data-each")))) row.removeAttribute("data-each");
      return;
    }
    var name = row.getAttribute("data-name");
    var each = parseFloat(row.getAttribute("data-each"));
    var dozen = parseFloat(row.getAttribute("data-dozen"));
    var price = parseFloat(row.getAttribute("data-price"));
    var desc = row.getAttribute("data-desc");
    var priceText = row.hasAttribute("data-unpriced") ? "Ask for pricing" : (!isNaN(price) ? money(price) : "");
    var id = "qty-" + row.getAttribute("data-key");
    row.innerHTML =
      '<div class="item-info"><label class="item-name" for="' + id + '">' + esc(name) + "</label>" +
      (priceText ? '<span class="item-price">' + priceText + "</span>" : "") +
      (desc ? '<span class="item-desc">' + esc(desc) + "</span>" : "") + "</div>" +
      '<div class="stepper">' +
      '<button type="button" class="step" data-step="-1" aria-label="One less ' + esc(name) + '">&minus;</button>' +
      '<input type="number" id="' + id + '" name="' + id + '" class="qty" value="0" min="0" max="' + MAX_QTY + '" step="1" inputmode="numeric" autocomplete="off">' +
      '<button type="button" class="step" data-step="1" aria-label="One more ' + esc(name) + '">+</button>' +
      "</div>" +
      (!isNaN(dozen) ? '<button type="button" class="step-dozen" data-step="12" aria-label="Add a dozen ' + esc(name) + '">+ 1 dozen</button>' : "") +
      (row.getAttribute("data-details") === "layer" ? '<div class="item-details" data-details-box></div>' : "");
    if (isNaN(dozen)) row.classList.remove("has-dozen"); else row.classList.add("has-dozen");
    if (isNaN(each)) row.removeAttribute("data-each");
  });

  function qtyOf(row) {
    var n = parseInt(row.querySelector(".qty").value, 10);
    return isNaN(n) || n < 0 ? 0 : Math.min(n, MAX_QTY);
  }
  function setQty(row, n) {
    n = Math.max(0, Math.min(MAX_QTY, n | 0));
    row.querySelector(".qty").value = String(n);
    syncRow(row);
  }

  function selectHtml(cls, label, options, current) {
    return '<label class="detail-field"><span>' + label + ' <span class="req">*</span></span><select class="' + cls + '">' +
      '<option value="">Choose</option>' +
      options.map(function (o) { return '<option value="' + esc(o) + '"' + (o === current ? " selected" : "") + ">" + esc(o) + "</option>"; }).join("") +
      "</select></label>";
  }

  // 8" cakes: one shape and flavor choice per cake
  function syncDetails(row) {
    var box = row.querySelector("[data-details-box]");
    if (!box) return;
    var n = Math.min(qtyOf(row), 20);
    var lines = box.querySelectorAll(".detail-line");
    for (var i = lines.length; i < n; i++) {
      var div = document.createElement("div");
      div.className = "detail-line";
      div.innerHTML = '<p class="detail-title">Cake ' + (i + 1) + "</p>" + selectHtml("d-shape", "Shape", CAKE_SHAPES, "") + selectHtml("d-flavor", "Flavor", CAKE_FLAVORS, "");
      box.appendChild(div);
    }
    for (var j = lines.length - 1; j >= n; j--) box.removeChild(lines[j]);
  }

  function syncRow(row) {
    row.classList.toggle("is-picked", qtyOf(row) > 0);
    syncDetails(row);
    updateEstimate();
  }

  function piecesText(n, noun, name) {
    var dz = Math.floor(n / 12), single = n % 12;
    var count = n === 12 ? "1 dozen" : (n % 12 === 0 ? (n / 12) + " dozen" : String(n));
    var extra = dz && single ? " (" + dz + " dozen + " + single + ")" : "";
    if (/^Brownies/.test(name)) return count + " " + name.replace(/^Brownies/, "brownies") + extra;
    var m = / (with|without) nuts$/.exec(name);
    if (m) return count + " " + name.slice(0, m.index) + " " + noun + " " + m[0].trim() + extra;
    return count + " " + name + " " + noun + extra;
  }

  // Items in the order, read straight from the number boxes (no "Add" step).
  function cartItems() {
    var items = [];
    rows.forEach(function (row) {
      var n = qtyOf(row);
      if (!n) return;
      var name = row.getAttribute("data-name");
      var each = parseFloat(row.getAttribute("data-each"));
      var dozen = parseFloat(row.getAttribute("data-dozen"));
      var price = parseFloat(row.getAttribute("data-price"));
      var item = { key: row.getAttribute("data-key"), qty: n, priced: true, total: null, details: [] };
      if (!isNaN(each) && !isNaN(dozen)) {
        item.text = piecesText(n, row.getAttribute("data-noun"), name);
        item.total = Math.floor(n / 12) * dozen + (n % 12) * each;
      } else if (!isNaN(price)) {
        item.text = name + ", quantity " + n;
        item.total = price * n;
      } else {
        item.text = name + ", quantity " + n;
        item.priced = false;
      }
      var box = row.querySelector("[data-details-box]");
      if (box) {
        var parts = [];
        box.querySelectorAll(".detail-line").forEach(function (line, i) {
          var shape = line.querySelector(".d-shape").value, flavor = line.querySelector(".d-flavor").value;
          item.details.push({ shape: shape, flavor: flavor });
          parts.push("cake " + (i + 1) + ": " + (shape || "shape not chosen") + ", " + (flavor || "flavor not chosen"));
        });
        if (parts.length) item.text += " (" + parts.join("; ") + ")";
      }
      items.push(item);
    });
    return items;
  }

  function updateEstimate() {
    var list = document.getElementById("estimate-lines");
    var totalEl = document.getElementById("estimate-total");
    var empty = document.getElementById("cart-empty");
    var items = cartItems();
    list.innerHTML = "";
    empty.hidden = items.length > 0;
    var sum = 0, unpriced = false;
    items.forEach(function (item) {
      var li = document.createElement("li");
      var left = document.createElement("span");
      left.textContent = item.text;
      var right = document.createElement("span");
      right.className = "cart-right";
      var price = document.createElement("span");
      if (item.priced && item.total != null) { price.textContent = money(item.total); sum += item.total; }
      else { price.textContent = "Priced when you order"; unpriced = true; }
      var rm = document.createElement("button");
      rm.type = "button";
      rm.className = "cart-remove";
      rm.setAttribute("data-cart-remove", item.key);
      rm.setAttribute("aria-label", "Remove " + item.text);
      rm.textContent = "Remove";
      right.appendChild(price);
      right.appendChild(rm);
      li.appendChild(left);
      li.appendChild(right);
      list.appendChild(li);
    });
    totalEl.hidden = items.length === 0;
    totalEl.textContent = "Estimated total: " + money(sum) + (unpriced ? ", plus items priced when you order" : "");
    var fb = document.querySelector("[data-float-order]");
    if (fb) {
      var count = items.reduce(function (a, i) { return a + i.qty; }, 0);
      fb.textContent = items.length ? "Finish my order (" + count + ")" : "Order Now";
      fb.setAttribute("href", items.length ? "#order" : "#menu");
    }
    checkMinimum(items);
    return items;
  }

  // $25 delivery minimum: friendly heads-up only, never blocks sending.
  function checkMinimum(items) {
    var note = form.querySelector("[data-min-note]");
    if (!note) return;
    var v = (form.querySelector('input[name="fulfillment"]:checked') || {}).value;
    var show = false;
    if (isDelivery(v) && items.length) {
      var sub = 0, unpriced = false;
      items.forEach(function (i) { if (i.priced && i.total != null) sub += i.total; else unpriced = true; });
      show = !unpriced && sub < DELIVERY_MIN;
    }
    note.hidden = !show;
  }

  form.addEventListener("click", function (e) {
    var step = e.target.closest("[data-step]");
    if (step) {
      var row = step.closest(".item-row");
      setQty(row, qtyOf(row) + parseInt(step.getAttribute("data-step"), 10));
      clearItemsError();
      return;
    }
    var rm = e.target.closest("[data-cart-remove]");
    if (rm) {
      var r = form.querySelector('.item-row[data-key="' + rm.getAttribute("data-cart-remove") + '"]');
      if (r) setQty(r, 0);
    }
  });
  form.addEventListener("input", function (e) {
    if (e.target.classList.contains("qty")) {
      syncRow(e.target.closest(".item-row"));
      clearItemsError();
    }
  });
  form.addEventListener("change", function (e) {
    if (e.target.classList.contains("qty")) {
      var row = e.target.closest(".item-row");
      setQty(row, qtyOf(row));
    } else if (e.target.closest(".item-details")) {
      clearFieldError(e.target);
      updateEstimate();
    }
  });

  // ---- Pickup / delivery ----
  var deliveryBox = form.querySelector("[data-delivery-area]");
  var pickupOtherBox = form.querySelector("[data-pickup-other]");
  function isDelivery(v) { return v === "Delivery"; }
  function isPickup(v) { return !!v && v !== "Delivery"; }
  function isPickupOther(v) { return v === PICKUP_OTHER_VALUE; }
  function fulfillmentDisplay(ful, otherLoc) {
    if (isPickupOther(ful) && otherLoc) return "Pickup at " + otherLoc;
    return ful;
  }
  function setSlotOptions(slots, placeholder, prev) {
    var sel = form.elements["time-slot"];
    if (!sel) return;
    while (sel.firstChild) sel.removeChild(sel.firstChild);
    var first = document.createElement("option");
    first.value = "";
    first.textContent = placeholder;
    sel.appendChild(first);
    var i, op;
    for (i = 0; i < slots.length; i++) {
      op = document.createElement("option");
      op.value = slots[i];
      op.textContent = slots[i];
      sel.appendChild(op);
    }
    var keep = false;
    if (prev) {
      for (i = 0; i < sel.options.length; i++) {
        if (sel.options[i].value === prev) { keep = true; break; }
      }
    }
    sel.value = keep ? prev : "";
    if (!keep && prev) clearFieldError(sel);
  }
  function syncTimeSlots() {
    var v = (form.querySelector('input[name="fulfillment"]:checked') || {}).value;
    var label = form.querySelector("[data-slot-label]");
    var hint = form.querySelector("[data-slot-hint]");
    var sel = form.elements["time-slot"];
    var prev = sel ? sel.value : "";
    if (hint) hint.hidden = true;
    if (isDelivery(v)) {
      if (label) label.innerHTML = 'Delivery window (3-hour window) <span class="req">*</span>';
      setSlotOptions(DELIVERY_SLOTS, "Choose a delivery window", prev);
    } else if (isPickup(v)) {
      if (label) label.innerHTML = 'Pickup time (1-hour slot) <span class="req">*</span>';
      setSlotOptions(PICKUP_SLOTS, "Choose a pickup time", prev);
    } else {
      if (label) label.innerHTML = 'Time slot <span class="req">*</span>';
      if (hint) hint.hidden = false;
      setSlotOptions([], "Choose pickup or delivery first", "");
    }
  }
  function syncFulfillment() {
    var v = (form.querySelector('input[name="fulfillment"]:checked') || {}).value;
    if (deliveryBox) deliveryBox.hidden = !isDelivery(v);
    if (pickupOtherBox) pickupOtherBox.hidden = !isPickupOther(v);
    form.querySelectorAll(".choice").forEach(function (label) {
      var input = label.querySelector("input");
      label.classList.toggle("is-checked", !!(input && input.checked));
    });
    syncTimeSlots();
    updateEstimate();
  }
  form.addEventListener("change", function (e) {
    if (e.target.name === "fulfillment") {
      syncFulfillment();
      var r = form.querySelector(".fulfillment .choice-row.has-error");
      if (r) r.classList.remove("has-error");
    }
  });

  // ---- Allergies: "No allergies" checkbox or a list ----
  var noAllergy = form.querySelector("[data-no-allergies]");
  var allergyInput = form.elements.allergies;
  function syncAllergy() {
    if (noAllergy.checked) {
      allergyInput.value = "None";
      allergyInput.disabled = true;
      clearFieldError(allergyInput);
      var fs = noAllergy.closest("fieldset");
      fs.classList.remove("has-error");
    } else {
      if (allergyInput.value === "None") allergyInput.value = "";
      allergyInput.disabled = false;
    }
  }
  noAllergy.addEventListener("change", syncAllergy);

  // ---- Date: min today, spelled-out preview ----
  var dateInput = form.elements["date-needed"];
  var dateSpelled = form.querySelector("[data-date-spelled]");
  (function () {
    var t = new Date();
    var mm = String(t.getMonth() + 1), dd = String(t.getDate());
    if (mm.length < 2) mm = "0" + mm;
    if (dd.length < 2) dd = "0" + dd;
    dateInput.min = t.getFullYear() + "-" + mm + "-" + dd;
    if (dateInput.type !== "date") dateInput.setAttribute("placeholder", "YYYY-MM-DD");
  })();
  function syncDate() { dateSpelled.textContent = parseISO(dateInput.value) ? spellDate(dateInput.value) : ""; }
  dateInput.addEventListener("input", syncDate);
  dateInput.addEventListener("change", syncDate);

  // ---- Validation ----
  function holderOf(el) { return el.closest("label") || el.parentElement; }
  function setFieldError(el, text) {
    var holder = holderOf(el);
    var err = holder.querySelector(".field-error");
    if (!err) { err = document.createElement("em"); err.className = "field-error"; holder.appendChild(err); }
    err.textContent = text;
    holder.classList.add("has-error");
    el.setAttribute("aria-invalid", "true");
  }
  function clearFieldError(el) {
    var holder = holderOf(el);
    if (!holder) return;
    var err = holder.querySelector(".field-error");
    if (err) err.remove();
    holder.classList.remove("has-error");
    el.removeAttribute("aria-invalid");
  }
  function clearItemsError() {
    var box = document.getElementById("estimate");
    box.classList.remove("has-error");
    var err = box.querySelector(".field-error");
    if (err) err.remove();
  }
  function clearAllErrors() {
    form.querySelectorAll("[aria-invalid]").forEach(clearFieldError);
    form.querySelectorAll(".has-error").forEach(function (n) { n.classList.remove("has-error"); });
    clearItemsError();
    var fe = form.querySelector("[data-form-error]");
    fe.hidden = true;
    fe.textContent = "";
  }

  function validateOrder() {
    clearAllErrors();
    var problems = [];
    var items = cartItems();
    if (!items.length && !val("custom")) {
      var box = document.getElementById("estimate");
      box.classList.add("has-error");
      var em = document.createElement("em");
      em.className = "field-error";
      em.textContent = "Your order is empty. Tap + next to at least one treat on the Menu, or write a custom request.";
      box.appendChild(em);
      problems.push([box, "Pick at least one treat (tap + on the Menu) or write a custom request."]);
    }
    form.querySelectorAll(".item-row .detail-line").forEach(function (line) {
      var title = line.querySelector(".detail-title").textContent;
      var shape = line.querySelector(".d-shape"), flavor = line.querySelector(".d-flavor");
      if (!shape.value) { setFieldError(shape, "Choose a shape."); problems.push([shape, '8" Two-Layer Cake, ' + title + ": choose a shape."]); }
      if (!flavor.value) { setFieldError(flavor, "Choose a flavor."); problems.push([flavor, '8" Two-Layer Cake, ' + title + ": choose a flavor."]); }
    });
    function need(name, test, text) {
      var el = form.elements[name];
      if (!el || el.disabled) return;
      if (!test(val(name), el)) { setFieldError(el, text); problems.push([el, text]); }
    }
    need("date-needed", function (v) {
      var d = parseISO(v);
      if (!d) return false;
      var t = new Date(); t.setHours(0, 0, 0, 0);
      return d >= t;
    }, "Please choose the date you need your order (today or later).");
    need("time-slot", function (v) { return !!v; }, isDelivery((form.querySelector('input[name="fulfillment"]:checked') || {}).value) ? "Please choose a delivery window." : "Please choose a pickup time.");
    var ful = form.querySelector('input[name="fulfillment"]:checked');
    if (!ful) {
      var cr = form.querySelector(".fulfillment .choice-row");
      cr.classList.add("has-error");
      problems.push([cr, "Please choose pickup or delivery."]);
    } else if (isDelivery(ful.value)) {
      need("delivery-area", function (v) { return v.length >= 8 && /\d/.test(v); }, "Please enter the full delivery address: street, city, and ZIP.");
    } else if (isPickupOther(ful.value)) {
      need("pickup-location", function (v) { return v.length >= 2; }, "Please tell us where you would like to pick up.");
    }
    need("name", function (v) { return v.replace(/[^A-Za-z]/g, "").length >= 2; }, "Please enter your full name.");
    need("phone", function (v) { return v.replace(/\D/g, "").length >= 10; }, "Please enter a phone number with area code.");
    need("email", function (v) { return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v); }, "Please enter a valid email address.");
    if (!noAllergy.checked && val("allergies").length < 2) {
      setFieldError(allergyInput, 'Check "No allergies" or list the allergies.');
      noAllergy.closest("fieldset").classList.add("has-error");
      problems.push([noAllergy, 'Allergies: check "No allergies" or list them.']);
    }
    if (!problems.length) return true;
    var fe = form.querySelector("[data-form-error]");
    fe.innerHTML = "";
    var head = document.createElement("strong");
    head.textContent = "Please fix " + (problems.length === 1 ? "this" : "these " + problems.length + " things") + " before sending:";
    var ul = document.createElement("ul");
    problems.forEach(function (p) { var li = document.createElement("li"); li.textContent = p[1]; ul.appendChild(li); });
    fe.appendChild(head);
    fe.appendChild(ul);
    fe.hidden = false;
    var first = problems[0][0];
    first.scrollIntoView({ behavior: "smooth", block: "center" });
    setTimeout(function () { try { first.focus({ preventScroll: true }); } catch (err) {} }, 400);
    return false;
  }
  form.addEventListener("input", function (e) { if (e.target.getAttribute && e.target.getAttribute("aria-invalid")) clearFieldError(e.target); });
  form.addEventListener("change", function (e) { if (e.target.getAttribute && e.target.getAttribute("aria-invalid")) clearFieldError(e.target); });

  // ---- Order text (email body, Instagram, text message, copy) ----
  function orderInfo() {
    var ful = (form.querySelector('input[name="fulfillment"]:checked') || {}).value || "";
    var otherLoc = isPickupOther(ful) ? val("pickup-location") : "";
    return {
      items: cartItems(),
      custom: val("custom"),
      name: val("name"),
      phone: val("phone"),
      email: val("email"),
      dateISO: val("date-needed"),
      date: spellDate(val("date-needed")),
      slot: val("time-slot"),
      fulfillmentValue: ful,
      fulfillment: fulfillmentDisplay(ful, otherLoc),
      pickupLocation: otherLoc,
      address: isDelivery(ful) ? val("delivery-area") : "",
      allergies: noAllergy.checked ? "None" : val("allergies"),
      notes: val("notes")
    };
  }
  function orderText(o) {
    var lines = ["Hi SweetWalks! I'd like to place an order.", "", "Items:"];
    var sum = 0, unpriced = false;
    o.items.forEach(function (i) {
      lines.push("- " + i.text + (i.priced && i.total != null ? " (" + money(i.total) + ")" : " (priced when you order)"));
      if (i.priced && i.total != null) sum += i.total; else unpriced = true;
    });
    if (!o.items.length) lines.push("- (none, see custom request)");
    if (o.items.length) lines.push("Estimated total: " + money(sum) + (unpriced ? ", plus items priced when you order" : ""));
    if (o.custom) lines.push("", "Custom request: " + o.custom);
    lines.push("", "Date needed: " + o.date, (isDelivery(o.fulfillmentValue || o.fulfillment) ? "Delivery window: " : "Pickup time: ") + o.slot, "Pickup or delivery: " + o.fulfillment);
    if (o.pickupLocation) lines.push("Pickup location: " + o.pickupLocation);
    if (o.address) lines.push("Delivery address: " + o.address);
    lines.push("Allergies: " + o.allergies, "", "Name: " + o.name, "Phone: " + o.phone, "Email: " + o.email);
    if (o.notes) lines.push("Notes: " + o.notes);
    return lines.join("\n");
  }

  function payload(o, body) {
    var data = {
      _subject: "New SweetWalks order request - " + (o.name || "website customer") + " - " + o.date,
      _template: "table",
      _captcha: "false",
      _cc: ORDER_CC,
      _autoresponse: "Thank you for your SweetWalks order request! Here is a copy of what you sent. We'll text you within 24 hours to confirm your total and deposit. Questions? Call or text " + PHONE_DISPLAY + ".",
      _honey: val("_honey"),
      name: o.name,
      phone: o.phone,
      email: o.email,
      date_needed: o.date,
      time_slot: o.slot,
      fulfillment: o.fulfillment,
      pickup_location: o.pickupLocation,
      delivery_address: o.address,
      items: o.items.map(function (i) { return i.text + (i.priced && i.total != null ? " (" + money(i.total) + ")" : " (priced when you order)"); }).join("\n"),
      custom_request: o.custom,
      allergies: o.allergies,
      notes: o.notes,
      message: body
    };
    if (o.email) data._replyto = o.email;
    return data;
  }

  function logLocal(key, entry) {
    try {
      var list = JSON.parse(localStorage.getItem(key) || "[]");
      list.push(entry);
      localStorage.setItem(key, JSON.stringify(list.slice(-10)));
    } catch (err) {}
  }

  function sendToSheet(data, result) {
    if (!SHEET_URL || !window.fetch) return;
    try {
      var copy = {};
      Object.keys(data).forEach(function (k) { if (k.charAt(0) !== "_" || k === "_honey") copy[k] = data[k]; });
      copy.formsubmit_result = result;
      copy.page = location.href;
      fetch(SHEET_URL, { method: "POST", mode: "no-cors", headers: { "Content-Type": "text/plain;charset=utf-8" }, body: JSON.stringify(copy) }).catch(function () {});
    } catch (err) {}
  }

  function sendOrder(data) {
    if (!window.fetch) return Promise.reject(new Error("no fetch"));
    var ctrl = window.AbortController ? new AbortController() : null;
    var timer = ctrl ? setTimeout(function () { ctrl.abort(); }, 25000) : null;
    return fetch(ORDER_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json", "Accept": "application/json" },
      body: JSON.stringify(data),
      signal: ctrl ? ctrl.signal : undefined
    }).then(function (res) {
      return res.json().catch(function () { return {}; }).then(function (json) {
        if (timer) clearTimeout(timer);
        var ok = json && (json.success === true || json.success === "true");
        if (!res.ok || !ok) throw new Error((json && json.message) || ("HTTP " + res.status));
        return json;
      });
    }, function (err) { if (timer) clearTimeout(timer); throw err; });
  }

  var okBox = form.querySelector("[data-send-ok]");
  var failBox = form.querySelector("[data-send-fail]");
  var lastBody = "";

  function showSuccess(o) {
    failBox.hidden = true;
    okBox.querySelector("[data-send-ok-text]").textContent =
      "Thank you, " + (o.name.split(" ")[0] || "friend") + "! Your order request for " + o.date + " (" + o.slot + ")" + (o.pickupLocation ? ", pickup at " + o.pickupLocation : "") + " is in. We'll text you at " + o.phone + " within 24 hours to confirm your total and deposit.";
    var ul = okBox.querySelector("[data-send-ok-lines]");
    ul.innerHTML = "";
    o.items.forEach(function (i) { var li = document.createElement("li"); li.textContent = i.text; ul.appendChild(li); });
    if (o.custom) { var li = document.createElement("li"); li.textContent = "Custom request: " + o.custom; ul.appendChild(li); }
    okBox.hidden = false;
    okBox.scrollIntoView({ behavior: "smooth", block: "center" });
    try { okBox.focus({ preventScroll: true }); } catch (err) {}
  }
  function showFailure(body) {
    okBox.hidden = true;
    lastBody = body;
    var sms = failBox.querySelector("[data-fail-sms]");
    sms.href = PHONE_SMS + "?&body=" + encodeURIComponent(body);
    failBox.querySelector("[data-copy-note]").textContent = "";
    failBox.hidden = false;
    failBox.scrollIntoView({ behavior: "smooth", block: "center" });
    try { failBox.focus({ preventScroll: true }); } catch (err) {}
  }

  function copyText(text) {
    function fallback() {
      var ta = document.createElement("textarea");
      ta.value = text;
      ta.setAttribute("readonly", "");
      ta.style.position = "fixed";
      ta.style.left = "-9999px";
      document.body.appendChild(ta);
      ta.select();
      var ok = false;
      try { ok = document.execCommand("copy"); } catch (err) {}
      document.body.removeChild(ta);
      return ok;
    }
    if (navigator.clipboard && navigator.clipboard.writeText) {
      return navigator.clipboard.writeText(text).then(function () { return true; }, function () { return fallback(); });
    }
    return Promise.resolve(fallback());
  }

  failBox.querySelector("[data-copy-order]").addEventListener("click", function () {
    var note = failBox.querySelector("[data-copy-note]");
    copyText(lastBody).then(function (ok) {
      note.textContent = ok ? "Your order is copied. Paste it into a text to " + PHONE_DISPLAY + "." : "We couldn't copy it. Please call or text " + PHONE_DISPLAY + ".";
    });
  });

  var sending = false;
  form.addEventListener("submit", function (e) {
    e.preventDefault();
    if (sending) return;
    if (!validateOrder()) return;
    var o = orderInfo();
    var body = orderText(o);
    var data = payload(o, body);
    saveRemembered(o);
    var btn = form.querySelector('button[type="submit"]');
    var label = btn.textContent;
    okBox.hidden = true;
    failBox.hidden = true;
    sending = true;
    btn.disabled = true;
    btn.textContent = "Sending, please wait...";
    var stamp = new Date().toISOString();
    if (data._honey) {
      // The spam trap was filled. FormSubmit discards these, so never show
      // "thank you": log it and show the call/text option instead.
      if (window.console) console.warn("SweetWalks order: spam-trap field was filled; FormSubmit will discard this submission.");
      logLocal("sweetwalks-spamtrap-log", { at: stamp, name: o.name, date: o.date });
    }
    sendOrder(data).then(function (json) {
      logLocal("sweetwalks-sent-log", { at: stamp, ok: true, date: o.date, items: o.items.length });
      sendToSheet(data, "sent");
      if (data._honey) showFailure(body); else showSuccess(o);
    }).catch(function (err) {
      logLocal("sweetwalks-sent-log", { at: stamp, ok: false, error: String(err && err.message || err) });
      sendToSheet(data, "failed: " + String(err && err.message || err));
      showFailure(body);
    }).then(function () {
      sending = false;
      btn.disabled = false;
      btn.textContent = label;
    });
  });

  var igBtn = form.querySelector("[data-order-instagram]");
  igBtn.addEventListener("click", function () {
    if (!validateOrder()) return;
    var o = orderInfo();
    var body = orderText(o);
    saveRemembered(o);
    var notice = form.querySelector("[data-ig-notice]");
    var pre = form.querySelector("[data-ig-copy-text]");
    copyText(body).then(function (ok) {
      notice.hidden = false;
      notice.className = "ig-copy-notice " + (ok ? "ok" : "err");
      notice.textContent = ok ? "Your order is copied. In the Instagram chat, tap the message box, paste, and send." : "We couldn't copy automatically. Copy the order below, then paste it into the Instagram chat.";
      pre.hidden = ok;
      pre.textContent = ok ? "" : body;
      window.open("https://ig.me/m/sweetwalks_bake", "_blank", "noopener,noreferrer");
    });
  });

  // ---- Remember info and reorder (this device only) ----
  var SAVED_KEY = "sweetwalks-saved";
  var REORDER_DISMISS = "sw-reorder-dismissed";
  var OLD_COOKIE_KEYS = { "Snickerdoodle": "cookie-snickerdoodle", "Macadamia Nut": "cookie-macadamia", "Peanut Butter": "cookie-peanut-butter", "Sugar": "cookie-sugar", "Oatmeal Raisin": "cookie-oatmeal-raisin" };
  function keyFromOld(item) {
    // Convert saves from the old dropdown form into the new item boxes.
    var f = item.fields || {};
    var mult = f.unit === "dozen" ? 12 : 1;
    var q = (parseInt(f.qty, 10) || 1) * mult;
    var key = null, qty = q;
    if (item.kind === "cookie") key = f.flavor === "Chocolate Chip" ? (f.nuts === "with nuts" ? "cookie-cc-nuts" : "cookie-cc-nonuts") : OLD_COOKIE_KEYS[f.flavor];
    else if (item.kind === "cupcake") {
      var r = rows.filter(function (row) { return row.getAttribute("data-key").indexOf("cupcake-") === 0 && row.getAttribute("data-name") === f.flavor; })[0];
      key = r && r.getAttribute("data-key");
    } else if (item.kind === "cake") {
      qty = parseInt(f.qty, 10) || 1;
      if (f.type === "9x13 Cake") key = "cake-9x13";
      else if (f.type === "Bundt Cake") key = { "7Up": "cake-bundt-7up", "Lemon": "cake-bundt-lemon", "Pineapple Upside Down": "cake-bundt-pineapple" }[f.flavor];
      else if (f.type && f.type.indexOf("Two-Layer") !== -1) { key = "cake-8in"; item.details = [{ shape: f.shape, flavor: f.flavor }]; }
    } else if (item.kind === "other") {
      if (f.type === "Brownies") key = f.nuts === "with nuts" ? "brownie-nuts" : "brownie-nonuts";
      else if (f.type === "Fudge") { key = f.nuts === "with nuts" ? "fudge-nuts" : "fudge-nonuts"; qty = parseInt(f.qty, 10) || 1; }
    }
    return key ? { key: key, qty: qty, text: item.text, details: item.details || [] } : null;
  }
  function readSaved() {
    try {
      var data = JSON.parse(localStorage.getItem(SAVED_KEY) || "null");
      if (!data || typeof data !== "object") return null;
      if (data.contact && data.contact.fulfillment) {
        var f = data.contact.fulfillment;
        if (f === "Delivery") {
          data.contact.pickupLocation = "";
        } else if (f === PICKUP_OTHER_VALUE || data.contact.pickupLocation) {
          data.contact.fulfillment = PICKUP_OTHER_VALUE;
          if (!data.contact.pickupLocation && f.indexOf("Pickup at ") === 0 && f !== PICKUP_VALUE) {
            data.contact.pickupLocation = f.slice(10);
          }
          data.contact.deliveryArea = "";
        } else if (f.indexOf("Pickup at ") === 0 && f !== PICKUP_VALUE) {
          data.contact.fulfillment = PICKUP_OTHER_VALUE;
          data.contact.pickupLocation = data.contact.pickupLocation || f.slice(10);
          data.contact.deliveryArea = "";
        } else {
          data.contact.fulfillment = PICKUP_VALUE;
          data.contact.deliveryArea = "";
        }
      }
      if (data.lastOrder && data.lastOrder.items) {
        data.lastOrder.items = data.lastOrder.items.map(function (i) { return i && i.key ? i : (i ? keyFromOld(i) : null); }).filter(Boolean);
      }
      return data;
    } catch (err) { return null; }
  }
  function writeSaved(d) { try { localStorage.setItem(SAVED_KEY, JSON.stringify(d)); } catch (err) {} }
  function clearSaved() {
    try { localStorage.removeItem(SAVED_KEY); } catch (err) {}
    try { sessionStorage.removeItem(REORDER_DISMISS); } catch (err) {}
  }
  function hasLast(d) { var l = d && d.lastOrder; return !!(l && ((l.items && l.items.length) || (l.custom && String(l.custom).trim()))); }
  var clearBtn = form.querySelector("[data-clear-saved]");
  var reorderCard = document.querySelector("[data-reorder-card]");
  function updateClearLink() { var d = readSaved(); clearBtn.hidden = !(d && (d.contact || hasLast(d))); }

  function saveRemembered(o) {
    if (!form.elements["remember-info"].checked) { clearSaved(); reorderCard.hidden = true; updateClearLink(); return; }
    writeSaved({
      contact: { name: o.name, phone: o.phone, email: o.email, fulfillment: o.fulfillmentValue || o.fulfillment, deliveryArea: o.address, pickupLocation: o.pickupLocation || "" },
      lastOrder: {
        items: o.items.map(function (i) { return { key: i.key, qty: i.qty, text: i.text, details: i.details }; }),
        custom: o.custom,
        timeSlot: o.slot,
        dateNeeded: o.date,
        savedAt: new Date().toISOString()
      }
    });
    updateClearLink();
  }
  function applyContact(c) {
    if (!c) return;
    ["name", "phone", "email"].forEach(function (k) { if (c[k] && form.elements[k]) form.elements[k].value = c[k]; });
    if (c.fulfillment) {
      form.querySelectorAll('input[name="fulfillment"]').forEach(function (r) { r.checked = r.value === c.fulfillment; });
      if (!form.querySelector('input[name="fulfillment"]:checked')) {
        if (c.pickupLocation) {
          var otherRadio = form.querySelector('input[name="fulfillment"][value="' + PICKUP_OTHER_VALUE + '"]');
          if (otherRadio) otherRadio.checked = true;
        }
        if (!form.querySelector('input[name="fulfillment"]:checked')) form.querySelector('input[name="fulfillment"]').checked = true;
      }
    }
    if (c.pickupLocation && form.elements["pickup-location"]) form.elements["pickup-location"].value = c.pickupLocation;
    if (c.deliveryArea) form.elements["delivery-area"].value = c.deliveryArea;
  }
  function renderReorder(d) {
    if (!hasLast(d)) { reorderCard.hidden = true; return; }
    try { if (sessionStorage.getItem(REORDER_DISMISS) === "1") { reorderCard.hidden = true; return; } } catch (err) {}
    var list = reorderCard.querySelector("[data-reorder-list]");
    list.innerHTML = "";
    d.lastOrder.items.forEach(function (i) { var li = document.createElement("li"); li.textContent = i.text; list.appendChild(li); });
    if (d.lastOrder.custom) { var li = document.createElement("li"); li.textContent = "Custom request: " + d.lastOrder.custom; list.appendChild(li); }
    reorderCard.hidden = list.children.length === 0;
  }
  function restoreItems(items) {
    rows.forEach(function (r) { setQty(r, 0); });
    items.forEach(function (i) {
      var r = form.querySelector('.item-row[data-key="' + i.key + '"]');
      if (!r) return;
      setQty(r, i.qty);
      var lines = r.querySelectorAll(".detail-line");
      (i.details || []).forEach(function (det, idx) {
        if (!lines[idx] || !det) return;
        if (det.shape) lines[idx].querySelector(".d-shape").value = det.shape;
        if (det.flavor) lines[idx].querySelector(".d-flavor").value = det.flavor;
      });
    });
    updateEstimate();
  }
  reorderCard.querySelector("[data-reorder-again]").addEventListener("click", function () {
    var d = readSaved();
    if (!hasLast(d)) return;
    restoreItems(d.lastOrder.items || []);
    form.elements.custom.value = d.lastOrder.custom || "";
    var slot = form.elements["time-slot"];
    if (d.lastOrder.timeSlot && Array.prototype.some.call(slot.options, function (op) { return op.value === d.lastOrder.timeSlot; })) slot.value = d.lastOrder.timeSlot;
    document.getElementById("estimate").scrollIntoView({ behavior: "smooth", block: "start" });
  });
  reorderCard.querySelector("[data-reorder-new]").addEventListener("click", function () {
    try { sessionStorage.setItem(REORDER_DISMISS, "1"); } catch (err) {}
    reorderCard.hidden = true;
  });
  clearBtn.addEventListener("click", function () {
    clearSaved();
    ["name", "phone", "email", "delivery-area", "pickup-location"].forEach(function (k) { if (form.elements[k]) form.elements[k].value = ""; });
    form.querySelector('input[name="fulfillment"]').checked = true;
    syncFulfillment();
    reorderCard.hidden = true;
    updateClearLink();
  });

  var saved = readSaved();
  if (saved && saved.contact) applyContact(saved.contact);
  renderReorder(saved);
  updateClearLink();
  syncFulfillment();
  syncAllergy();
  syncDate();

  // Floating Order button: hidden at the top and while the order section is on screen
  var floatBtn = document.querySelector("[data-float-order]");
  var orderSection = document.getElementById("order");
  if (floatBtn && "IntersectionObserver" in window) {
    var hide = { order: false, hero: true };
    var sync = function () { floatBtn.classList.toggle("is-hidden", hide.order || hide.hero); };
    new IntersectionObserver(function (en) { hide.order = en[0].isIntersecting; sync(); }, { threshold: 0.05 }).observe(orderSection);
    var hero = document.querySelector(".hero");
    if (hero) new IntersectionObserver(function (en) { hide.hero = en[0].isIntersecting; sync(); }, { threshold: 0, rootMargin: "-80px 0px -90px 0px" }).observe(hero);
  }

  window.swOrderDebug = { cartItems: cartItems, spellDate: spellDate, orderInfo: orderInfo, orderText: orderText };
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
    '<p class="email-chooser-alert" hidden></p>' +
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
  var alertEl = modal.querySelector(".email-chooser-alert");
  var copyBtnEl = modal.querySelector('[data-mail="copy"]');
  function open(subject, body, alertText) {
    current.subject = subject || "";
    current.body = body || "";
    note.textContent = "";
    alertEl.textContent = alertText || "";
    alertEl.hidden = !alertText;
    copyBtnEl.textContent = current.body ? "Copy order and email address" : "Copy email address";
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
      var hasBody = !!current.body;
      var text = hasBody
        ? "Send to: " + ADDR + "\r\nSubject: " + (current.subject || "Order request") + "\r\n\r\n" + current.body
        : ADDR;
      var done = function (ok) {
        if (hasBody) {
          note.textContent = ok
            ? "Order and email address copied. Paste them into a new email to " + ADDR + " and send."
            : "We couldn't copy automatically. Please email your order to " + ADDR + ".";
        } else {
          note.textContent = ok ? "Email address copied." : "Our email is " + ADDR;
        }
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


// Holiday banners (times are fixed instants, so they work in any time zone):
// - Thanksgiving banner and cutoff line hide after Sunday, November 22, 2026, 11:59:59 PM Pacific.
// - Christmas banner shows from Monday, November 23, 2026, 12:00 AM Pacific
//   through Thursday, December 24, 2026, 11:59:59 PM Pacific.
// Without JavaScript the Thanksgiving banner and the deadlines list stay visible.
(function () {
  var root = document.documentElement;
  var now = new Date().getTime();
  var XMAS_START = Date.UTC(2026, 10, 23, 8, 0, 0);
  var XMAS_END = Date.UTC(2026, 11, 25, 8, 0, 0);
  var key = "sw-promo-dismissed-2026-thanks";
  var thanks = document.querySelector("[data-thanks-cutoff-banner]");
  var xmas = document.querySelector("[data-xmas-banner]");
  function addClass(c) { if (!root.classList.contains(c)) root.classList.add(c); }
  if (now >= XMAS_START) {
    key = "sw-promo-dismissed-2026-xmas";
    addClass("thanks-cutoff-passed");
    var nodes = document.querySelectorAll("[data-thanks-cutoff], [data-thanks-cutoff-banner]");
    for (var i = 0; i < nodes.length; i++) nodes[i].hidden = true;
  }
  if (now >= XMAS_START && now < XMAS_END) addClass("xmas-on");
  if (now >= XMAS_END) addClass("promo-hidden");
  var active = now >= XMAS_START ? xmas : thanks;
  try { if (window.sessionStorage && sessionStorage.getItem(key)) addClass("promo-hidden"); } catch (e) {}
  var btns = document.querySelectorAll("[data-promo-dismiss]");
  for (var j = 0; j < btns.length; j++) {
    btns[j].addEventListener("click", function () {
      if (active) active.hidden = true;
      addClass("promo-hidden");
      try { sessionStorage.setItem(key, "1"); } catch (e) {}
    });
  }
})();


// The order form script loaded: hide the "buttons don't work? call or text" note.
(function () {
  if (!document.getElementById("order-form") || !document.querySelector(".item-row .qty")) return;
  document.documentElement.classList.add("sw-ready");
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


// Add SweetWalks to the home screen: Android/Chrome install prompt, iPhone steps.
(function () {
  var DISMISS_KEY = "sweetwalks-install-dismissed";
  var DISMISS_MS = 14 * 24 * 60 * 60 * 1000;
  var deferredPrompt = null;
  var banner = document.querySelector("[data-install-banner]");
  var bannerBtn = document.querySelector("[data-install-action]");
  var dismissBtn = document.querySelector("[data-install-dismiss]");
  var footerBtn = document.querySelector("[data-install-open]");
  var footerWrap = document.querySelector(".footer-install");
  var sheet = document.querySelector("[data-install-sheet]");
  var sheetClose = sheet ? sheet.querySelector("[data-install-sheet-close]") : null;
  var safariSteps = sheet ? sheet.querySelector("[data-install-safari-steps]") : null;
  var iosOtherSteps = sheet ? sheet.querySelector("[data-install-ios-other]") : null;
  var genericSteps = sheet ? sheet.querySelector("[data-install-generic]") : null;
  var lastFocus = null;

  function isStandalone() {
    if (window.navigator.standalone === true) return true;
    if (window.matchMedia && window.matchMedia("(display-mode: standalone)").matches) return true;
    return false;
  }

  function isIos() {
    var ua = navigator.userAgent || "";
    if (/iPad|iPhone|iPod/.test(ua)) return true;
    if (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1) return true;
    return false;
  }

  function isIosSafari() {
    var ua = navigator.userAgent || "";
    if (!isIos()) return false;
    if (/CriOS|FxiOS|OPiOS|EdgiOS|mercury|GSA\/|DuckDuckGo|Instagram|FBAN|FBAV|FBIOS|Line\/|LinkedIn|Twitter|Snapchat|Pinterest|TikTok|Bytedance|musical_ly/.test(ua)) {
      return false;
    }
    return /Safari/.test(ua);
  }

  function isMobileViewport() {
    return !(window.matchMedia && window.matchMedia("(min-width: 1100px)").matches);
  }

  function dismissedRecently() {
    try {
      var raw = localStorage.getItem(DISMISS_KEY);
      if (!raw) return false;
      var t = parseInt(raw, 10);
      if (!t) return false;
      return (Date.now() - t) < DISMISS_MS;
    } catch (err) {
      return false;
    }
  }

  function rememberDismiss() {
    try {
      localStorage.setItem(DISMISS_KEY, String(Date.now()));
    } catch (err) {}
  }

  function setBannerLabel(label) {
    if (bannerBtn) bannerBtn.textContent = label;
  }

  function showBanner() {
    if (!banner || !isMobileViewport() || dismissedRecently() || isStandalone()) return;
    banner.hidden = false;
  }

  function hideBanner() {
    if (banner) banner.hidden = true;
  }

  function hideAllInstallUi() {
    hideBanner();
    if (footerWrap) footerWrap.hidden = true;
    closeSheet();
  }

  function setSheetMode(mode) {
    if (safariSteps) safariSteps.hidden = mode !== "ios-safari";
    if (iosOtherSteps) iosOtherSteps.hidden = mode !== "ios-other";
    if (genericSteps) genericSteps.hidden = mode !== "generic";
  }

  function openSheet(mode) {
    if (!sheet) return;
    lastFocus = document.activeElement;
    setSheetMode(mode);
    sheet.hidden = false;
    if (sheetClose && sheetClose.focus) sheetClose.focus();
  }

  function closeSheet() {
    if (!sheet || sheet.hidden) return;
    sheet.hidden = true;
    if (lastFocus && lastFocus.focus) {
      try { lastFocus.focus(); } catch (err) {}
    }
  }

  function runAndroidPrompt() {
    var ev = deferredPrompt;
    if (!ev) return;
    deferredPrompt = null;
    hideBanner();
    ev.prompt();
  }

  function openHelp() {
    if (deferredPrompt) {
      runAndroidPrompt();
      return;
    }
    if (isIos()) {
      openSheet(isIosSafari() ? "ios-safari" : "ios-other");
      return;
    }
    openSheet("generic");
  }

  if (isStandalone()) {
    document.documentElement.classList.add("is-standalone");
    hideAllInstallUi();
    return;
  }

  window.addEventListener("beforeinstallprompt", function (e) {
    e.preventDefault();
    deferredPrompt = e;
    setBannerLabel("Install the SweetWalks app");
    showBanner();
  });

  window.addEventListener("appinstalled", function () {
    deferredPrompt = null;
    hideAllInstallUi();
  });

  if (isIos()) {
    setBannerLabel("Add SweetWalks to your home screen");
    showBanner();
  }

  if (bannerBtn) {
    bannerBtn.addEventListener("click", function () {
      if (deferredPrompt) runAndroidPrompt();
      else openHelp();
    });
  }
  if (dismissBtn) {
    dismissBtn.addEventListener("click", function () {
      rememberDismiss();
      hideBanner();
    });
  }
  if (footerBtn) {
    footerBtn.addEventListener("click", function () {
      openHelp();
    });
  }
  if (sheet) {
    sheet.addEventListener("click", function (e) {
      var t = e.target;
      if (t === sheet) { closeSheet(); return; }
      if (t && t.closest && t.closest("[data-install-sheet-close]")) closeSheet();
    });
  }
  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape") closeSheet();
  });
  window.addEventListener("resize", function () {
    if (isStandalone()) {
      hideAllInstallUi();
      return;
    }
    if (!isMobileViewport()) {
      hideBanner();
      return;
    }
    if ((deferredPrompt || isIos()) && !dismissedRecently()) showBanner();
  });
})();
