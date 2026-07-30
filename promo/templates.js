export const templates = {
  'free-play': {
    theme: 'yuNo', gameStyle: 'starfield', logo: 'pixel', classic: true, boundaries: false, crt: 'off',
    headline: '[[effect:shadow]]July [[effect:wave]]Free Play[[/effect]] Calendar[[/effect]]', detail: '[[effect:sweep]]Unlimited[[/effect]] Credits on All Games!!',
    body: '[[atascii-7F]] 2nd Thursday[[leader-tab]][[effect:highlight]]Thu 7/9[[/effect]]\n[[atascii-7F]] Portland [[atascii-00]] Pride[[leader-tab]][[effect:highlight]]Sun 7/19[[/effect]]\n[[atascii-7F]] Last Wednesday[[leader-tab]][[effect:highlight]]Wed 7/29[[/effect]]',
    cta: '[[effect:superscript]]$[[/effect]]6 NOON-5[[effect:subscript]]PM[[/effect]] (ALL AGES)\n[[effect:superscript]]$[[/effect]]12 5[[effect:subscript]]PM[[/effect]]-MIDNIGHT (21+)', hours: 'ALL AGES NOON-5PM [[petscii-upper-5a]] 21+ 5PM-MIDNIGHT', footer: '115 NW 5[[effect:superscript]]th[[/effect]] Ave Portland, OR\nwww.groundkontrol.com',
    scales: { headerScale: '2', detailScale: '1', bodyScale: '1', ctaScale: '1', footerScale: '1' },
    alignments: { header: 'center', detail: 'center', body: 'left', cta: 'center', footer: 'center' },
    verticalAlignments: { header: 'center', detail: 'top', body: 'center', cta: 'top', footer: 'bottom' },
    visibility: { detail: true, cta: true, hours: false }, scrollModes: { detail: 'off', hours: 'reveal' }, bodyBorder: 'none',
    fonts: { font: 'Beachball', headerFont: 'Reactor', detailFont: 'Reactor', ctaFont: 'ZX Eurostile', footerFont: 'Cinema Bold' }
  },
  'arcade-events': {
    theme: 'neon', gameStyle: 'starfield', logo: 'pixel', classic: true, boundaries: false, crt: 'off',
    headline: '[[effect:shadow]]Arcade Events This Week[[/effect]]', detail: '[[effect:underline]]July 20-26[[/effect]]',
    body: '[[effect:highlight]]Monday 7/20[[/effect]]\nMario Kart World Tournament + Killer Queen Community Night\n[[effect:highlight]]Tuesday 7/21[[/effect]]\nLX Entertainment Night: UFO 50\n[[effect:highlight]]Wednesday 7/22[[/effect]]\nElectropop/Chiptune Show\nCrunk Witch + Tonight We Launch!\n[[effect:highlight]]Sunday 7/26[[/effect]]\nSamurai Showdown II Tournament',
    cta: '[[atascii-7E]][[atascii-7E]][[atascii-7E]][[atascii-7E]][[atascii-7E]]   SUMMER PROMO   [[atascii-7F]][[atascii-7F]][[atascii-7F]][[atascii-7F]][[atascii-7F]]\n50% OFF ALL GAMES NOON-5PM', hours: 'ALL AGES NOON-5PM [[petscii-upper-5a]] 21+ 5PM-MIDNIGHT', footer: '115 NW 5[[effect:superscript]]th[[/effect]] Ave Portland, OR\nwww.groundkontrol.com',
    scales: { headerScale: '2', detailScale: '1', bodyScale: '1', ctaScale: '1', footerScale: '1' },
    alignments: { header: 'center', detail: 'center', body: 'center', cta: 'center', footer: 'center' },
    verticalAlignments: { header: 'center', detail: 'top', body: 'top', cta: 'center', footer: 'bottom' },
    visibility: { detail: false, cta: true, hours: true }, scrollModes: { detail: 'off', hours: 'reveal' }, bodyBorder: 'rounded',
    fonts: { font: 'Beachball', headerFont: 'Reactor', detailFont: 'Reactor', ctaFont: 'ZX Eurostile', footerFont: 'Cinema Bold' }
  },
  announcement: {
    theme: 'pulse', gameStyle: 'moon-patrol', logo: 'pixel', classic: true, boundaries: false, crt: 'off',
    headline: '[[effect:shadow]]Friday 7/17\n[[effect:blink]]Closed[[/effect]][[/effect]]', detail: 'Until 7PM',
    body: 'Opening to the\npublic at7PM (21+)',
    cta: 'MORE DETAILS SOON', hours: 'ALL AGES NOON-5PM [[petscii-upper-5a]] 21+ 5PM-MIDNIGHT', footer: '[[effect:stroke]]115 NW 5[[effect:superscript]]th[[/effect]] Ave Portland, OR[[/effect]]\n[[effect:stroke]]www.groundkontrol.com[[/effect]]',
    scales: { headerScale: '2', detailScale: '1', bodyScale: '1', ctaScale: '1', footerScale: '1' },
    alignments: { header: 'center', detail: 'center', body: 'center', cta: 'center', footer: 'center' },
    verticalAlignments: { header: 'center', detail: 'top', body: 'top', cta: 'center', footer: 'bottom' },
    visibility: { detail: true, cta: false, hours: false }, scrollModes: { detail: 'off', hours: 'reveal' }, bodyBorder: 'rounded',
    fonts: { font: 'Beachball', headerFont: 'Reactor', detailFont: 'Reactor', ctaFont: 'ZX Eurostile', footerFont: 'Cinema Bold' }
  },
  pinball: {
    theme: 'cobalt', gameStyle: 'wireframe', logo: 'pixel', classic: true, boundaries: false, crt: 'off',
    headline: 'June 2026\n[[effect:spin]]Pinball Tournaments[[/effect]]', detail: '[[effect:sweep]]Unlimited[[/effect]] Credits on All Games!!',
    body: '[[petscii-upper-51]] Mon 6/8[[leader-tab]][[effect:highlight]]Stall Ball Bonanza[[/effect]]\n[[petscii-upper-51]] Wed 6/10[[leader-tab]][[effect:highlight]]Stern Army Match Play[[/effect]]\n[[petscii-upper-51]] Wed 6/17[[leader-tab]][[effect:highlight]]Group Match Play[[/effect]]\n[[petscii-upper-51]] Thu 6/18[[leader-tab]][[effect:highlight]]Gender Expansive Div.[[/effect]]\n[[petscii-upper-51]] Tue 6/30[[leader-tab]][[effect:highlight]]Double Head-2-Head[[/effect]]',
    cta: 'HIGH SCORE CONTEST\nGAME OF THE MONTH', hours: 'ALL AGES NOON-5PM [[petscii-upper-5a]] 21+ 5PM-MIDNIGHT', footer: '115 NW 5[[effect:superscript]]th[[/effect]] Ave Portland, OR\nwww.groundkontrol.com',
    scales: { headerScale: '2', detailScale: '1', bodyScale: '1', ctaScale: '1', footerScale: '1' },
    alignments: { header: 'center', detail: 'center', body: 'left', cta: 'center', footer: 'center' },
    verticalAlignments: { header: 'center', detail: 'top', body: 'top', cta: 'top', footer: 'bottom' },
    visibility: { detail: false, cta: true, hours: true }, scrollModes: { detail: 'off', hours: 'reveal' }, bodyBorder: 'none',
    sectionOrder: ['logo', 'header', 'detail', 'body', 'cta', 'image', 'footer'],
    image: { source: './assets/images/tmnt.png', sourceName: 'tmnt.png', resolution: 149, threshold: 77, contrast: 160, dither: 'bayer2', ditherAmount: 67, color: 'highlight', align: 'center', scale: 64, opacity: 100, invert: true },
    fonts: { font: 'Cabaret Bold', headerFont: 'You Squared', detailFont: 'Reactor', ctaFont: 'Needlecast Heavy', footerFont: 'Cinema Bold' },
    crtControls: { curve: 130, rgb: 50, scanline: 40, mask: 50, vignette: 120, drift: 7, bloom: 120, glow: 170 }
  }
};

export function populateTemplateSelect(select) {
  const templateIds = Object.keys(templates);
  const selectedTemplate = templates[select.value] ? select.value : templateIds[0];
  select.replaceChildren(...templateIds.map(templateId => new Option(templateId.replaceAll('-', ' ').toUpperCase(), templateId)));
  select.value = selectedTemplate;
}
