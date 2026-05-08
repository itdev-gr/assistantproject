declare const __AGA_LOCALE__: string;

interface Bundle {
  placeholder: string;
  send: string;
  thinking: string;
  noInfo: string;
  promoted: string;
  closeAria: string;
  openAria: string;
  title: string;
}

const EL: Bundle = {
  placeholder: 'Ρωτήστε με οτιδήποτε…',
  send: 'Αποστολή',
  thinking: 'Ψάχνω…',
  noInfo: 'Δεν έχω αυτή την πληροφορία. Η ρεσεψιόν μπορεί να βοηθήσει.',
  promoted: 'Συνεργάτης',
  closeAria: 'Κλείσιμο',
  openAria: 'Άνοιγμα assistant',
  title: 'Guest Assistant',
};

const EN: Bundle = {
  placeholder: 'Ask me anything…',
  send: 'Send',
  thinking: 'Looking that up…',
  noInfo: "I don't have that information. Reception can help.",
  promoted: 'Partner',
  closeAria: 'Close',
  openAria: 'Open assistant',
  title: 'Guest Assistant',
};

export const M: Bundle = __AGA_LOCALE__ === 'en' ? EN : EL;
