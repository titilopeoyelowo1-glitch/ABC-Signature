/* ==========================================================================
   CONFIG: everything real goes here. Nothing below needs editing.
   ========================================================================== */
var CONFIG = {
  // ---- EDIT THESE TO CHANGE CONTACT / SOCIAL LINKS SITE-WIDE ----
  whatsapp: "447598909904",   // digits only, with country code, NO "+" or spaces
  email: "",                  // e.g. "hello@abcsignature.com"

  instagram: "https://www.instagram.com/abc_signature?stkn=eGhna3R6bWtjczV4",
  tiktok: "https://www.tiktok.com/@abc_signature?_r=1&_t=ZS-99v8tUPz5t7",

  // Pre-filled text for each WhatsApp button. Edit the wording any time.
  waMessages: {
    bookGlam: "Hi, I\u2019d like to book your glam services. Please share your availability and booking details.",
    customQuote: "Hi, I\u2019d like to get a custom quote for your makeup services. Please let me know what details you need.",
    chat: "Hi! I\u2019d love to make an enquiry about your makeup services."
  },
  // -----------------------------------------------------------------

  // Photos are placed directly in index.html (an <img> inside each .slot), so the page looks right even before scripts run.
  // To swap a photo, replace the file in images/ (same name) or edit that <img>. A slot with no <img> can still be filled here:
  // slot name (hero, about, p1 … p8) -> URL, or { src, srcset, alt }.
  images: {},

  // Real client reviews only: [{ quote: "", name: "", occasion: "" }]. The section stays hidden until you add one.
  testimonials: []
};

$(function () {

  /* Payment Details: tap/click to copy the sort code or account number */
  $('.copy-field').on('click', function () {
    var $btn = $(this);
    var text = String($btn.data('copy'));
    function showCopied() {
      clearTimeout($btn.data('copyTimer'));
      $btn.addClass('is-copied');
      var t = setTimeout(function () { $btn.removeClass('is-copied'); }, 1600);
      $btn.data('copyTimer', t);
    }
    function legacyCopy() {
      var $tmp = $('<textarea readonly></textarea>').val(text).css({ position: 'fixed', top: '-1000px', left: '-1000px' });
      $('body').append($tmp);
      $tmp[0].focus();
      $tmp[0].select();
      $tmp[0].setSelectionRange(0, text.length);
      try { document.execCommand('copy'); } catch (e) {}
      $tmp.remove();
      showCopied();
    }
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(showCopied, legacyCopy);
    } else {
      legacyCopy();
    }
  });

  /* Photo slots */
  $('[data-slot]').each(function () {
    if ($(this).children('img').length) return;   // photo already in the HTML
    var $s = $(this), cfg = CONFIG.images[$s.data('slot')], label = $s.data('label') || 'Photograph';
    if (cfg) {
      var o = typeof cfg === 'string' ? { src: cfg } : cfg;
      var $img = $('<img>', { src: o.src, alt: o.alt || label, decoding: 'async', loading: $s.is('[data-eager]') ? 'eager' : 'lazy' });
      if (o.srcset) $img.attr({ srcset: o.srcset, sizes: '(min-width: 1024px) 40vw, 50vw' });
      $s.prepend($img);
    } else {
      $('<span class="slot-empty">').text('Photo: ' + label).appendTo($s);
    }
  });

  /* Testimonials: shown only when real ones exist */
  if (CONFIG.testimonials.length) {
    $.each(CONFIG.testimonials, function (_, t) {
      $('<figure class="border-t-4 border-berry bg-white p-6 shadow-sm">')
        .append($('<blockquote class="font-serif text-xl italic">').text(t.quote))
        .append($('<figcaption class="mt-4 text-sm text-muted">').text($.grep([t.name, t.occasion], Boolean).join(', ')))
        .appendTo('#quotes');
    });
    $('#reviews, button[data-section="reviews"]').removeClass('hidden');
  }

  /* WhatsApp link helper: builds a proper wa.me link that works on iPhone, Android and desktop */
  function waUrl(text) { return 'https://wa.me/' + CONFIG.whatsapp + '?text=' + encodeURIComponent(text); }

  /* The three named WhatsApp CTAs, each with its own fixed pre-filled message */
  var $btnBookGlam = $('#btnBookGlam');
  var $btnCustomQuote = $('#btnCustomQuote');
  var $waBtn = $('#waBtn');
  var $waFooterLink = $('#waFooterLink');

  if (CONFIG.whatsapp) {
    $btnBookGlam.attr({ href: waUrl(CONFIG.waMessages.bookGlam), target: '_blank', rel: 'noopener' });
    $btnCustomQuote.attr({ href: waUrl(CONFIG.waMessages.customQuote), target: '_blank', rel: 'noopener' });
    $waBtn.attr({ href: waUrl(CONFIG.waMessages.chat), target: '_blank', rel: 'noopener' });
    $waFooterLink.attr({ href: waUrl(CONFIG.waMessages.chat), target: '_blank', rel: 'noopener' }).prop('hidden', false);
  } else {
    var pendingWa = 'Booking contact details are coming soon. Please check back shortly.';
    $.each([$btnBookGlam, $btnCustomQuote, $waBtn], function (i, $el) {
      $el.on('click', function (e) { e.preventDefault(); $('#formStatus').text(pendingWa); });
    });
  }

  /* Booking form: validates, then opens WhatsApp addressed to ABC Signature (CONFIG.whatsapp) with the booking details pre-filled.
     The client only has to press SEND. The client's own number is entered in the form and included inside the message. */
  var $form = $('#bookForm'), $status = $('#formStatus'), $select = $('#f-service');

  function setStatus(text, kind) {
    $status.removeClass('text-muted text-berry text-red-700').addClass(kind === 'error' ? 'text-red-700' : kind === 'ok' ? 'text-berry' : 'text-muted').text(text);
  }
  function prettyDate(iso) {
    var dt = new Date(iso + 'T00:00:00');
    return isNaN(dt) ? iso : dt.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
  }
  function bookingMessage(d) {
    return [
      '\uD83D\uDC84 NEW BOOKING REQUEST',
      'ABC SIGNATURE',
      '',
      'Client Name: ' + d.name,
      '',
      'WhatsApp / Phone: ' + d.phone,
      '',
      'Service: ' + d.service,
      '',
      'Date: ' + prettyDate(d.date),
      '',
      'Location: ' + d.location,
      '',
      'Message:',
      d.message || 'None provided',
      '',
      'I would like to book this appointment. Please confirm availability.'
    ].join('\n');
  }

  $form.on('submit', function (e) {
    e.preventDefault();
    var d = {
      name: $.trim($('#f-name').val()),
      phone: $.trim($('#f-phone').val()),
      service: $select.val(),
      date: $('#f-date').val(),
      location: $.trim($('#f-loc').val()),
      message: $.trim($('#f-msg').val())
    };

    var required = [['name', '#f-name'], ['phone', '#f-phone'], ['service', '#f-service'], ['date', '#f-date'], ['location', '#f-loc']];
    for (var i = 0; i < required.length; i++) {
      if (!d[required[i][0]]) {
        setStatus('Please complete all required fields before booking your appointment.', 'error');
        $(required[i][1]).trigger('focus');
        return;
      }
    }

    if (!CONFIG.whatsapp) { setStatus('Booking contact details are coming soon. Please check back shortly.', 'error'); return; }

    var url = waUrl(bookingMessage(d));
    var w = window.open(url, '_blank', 'noopener');
    if (!w) { window.location.href = url; }   // pop-up blocked: open WhatsApp in this tab instead

    $status.removeClass('text-muted text-red-700').addClass('text-berry').empty()
      .append($('<strong class="block">').text('Your booking request is ready to send!'))
      .append($('<span class="mt-2 block">').text('We\u2019ve opened WhatsApp with your booking details. Please tap SEND in WhatsApp to send your request to ABC Signature. Once received, we\u2019ll contact you to confirm your appointment.'));
  });

  /* Service links pre-select the booking form */
  $('[data-service]').on('click', function () {
    var v = $(this).data('service');
    $select.find('option').each(function () { if ($(this).text() === v) $select.val($(this).val()); });
  });

  if (CONFIG.instagram) $('#igLink').attr({ href: CONFIG.instagram, target: '_blank', rel: 'noopener' }).prop('hidden', false);
  if (CONFIG.tiktok) $('#ttLink').attr({ href: CONFIG.tiktok, target: '_blank', rel: 'noopener' }).prop('hidden', false);
});
