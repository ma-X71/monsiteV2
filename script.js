const SECTIONS = [
  {
    num: '001',
    title: 'Tu es à\nl\'intérieur.',
    paras: [
      'Les trois plans sont fixes dans l\'espace 3D.',
      'Seul le texte se déplace quand tu scrolles.',
      'La déformation ne bouge jamais — c\'est la géométrie fixe du cube.'
    ]
  },
  {
    num: '002',
    title: 'Plansfixes.',
    paras: [
      'Plan haut : rotateX(-45°), ancré à sa jonction basse.',
      'Plan centre :  plat, face à toi. C\'est là que vit le contenu principal.',
      'Plan bas : rotateX(45°), ancré à sa jonction haute.'
    ]
  },
  {
    num: '003',
    title: 'Seamless.',
    paras: [
      'Chaque bande a un offset vertical précis pour que le contenu soit continu aux jonctions.',
      'Plan haut : translateY(-y + 15vh). Plan centre : translateY(-y).',
      'Plan bas : translateY(-y − 70vh). Continuité parfaite aux arêtes.'
    ]
  },
  {
    num: '004',
    title: 'Perspective\nnative.',
    paras: [
      'Aucune librairie. CSS preserve-3d et rotateX uniquement.',
      'La perspective déforme le texte naturellement quand il entre dans les zones inclinées.',
      'Plus la valeur est basse, plus le FOV est large — comme Minecraft.'
    ]
  },
  {
    num: '005',
    title: 'Horse\nHabit.',
    paras: [
      'C\'est exactement cet effet que le site référencé utilise.',
      'La structure cubique est fixe, rigide, permanente.',
      'Le contenu glisse à travers elle comme si l\'écran était courbé en cube.'
    ]
  },
  {
    num: '006',
    title: 'Ton\ncontenu\nici.',
    paras: [
      'Modifie le tableau SECTIONS[] dans le JS.',
      'Chaque section fait 70vh — la hauteur du plan central.',
      'Ajoute autant de sections que tu veux, le scroll s\'adapte.'
    ]
  },
  {
    num: '007',
    title: 'Customise.',
    paras: [
      'perspective: 150px → plus doux = 400px, plus intense = 80px.',
      'Angle rotateX: 45° → plus courbé = 70°, plus plat = 20°.',
      'Hauteur plans haut/bas: 15vh → ajuste selon le rendu voulu.'
    ]
  },
  {
    num: '008',
    title: 'Fin.',
    paras: [
      'Remonte au début pour revoir l\'effet depuis le départ.',
      'Le cube ne bouge jamais.',
      'C\'est toi qui traverses le contenu.'
    ]
  }
];

const N = SECTIONS.length;
const vh = () => window.innerHeight;
const TOP_CENTRE  = () => vh() * 0.15;   // 15vh
const H_CENTRE    = () => vh() * 0.70;   // 70vh

function renderSection(s) {
  const parasHTML = s.paras.map((p, i) =>
    (i > 0 ? '<div class="s-divider"></div>' : '') + '<p>' + p + '</p>'
  ).join('');
  return '<div class="section">'
    + '<div class="s-num">' + s.num + '</div>'
    + '<div class="s-body">'
    + '<h2>' + s.title.replace(/\n/g, '<br>') + '</h2>'
    + parasHTML
    + '</div></div>';
}
const bandeHTML = SECTIONS.map(renderSection).join('');

document.getElementById('b-haut').innerHTML   = bandeHTML;
document.getElementById('b-centre').innerHTML = bandeHTML;
document.getElementById('b-bas').innerHTML    = bandeHTML;

document.getElementById('scroll-spacer').style.height =
  ((N - 1) * H_CENTRE() + vh()) + 'px';

let scrollY = 0, currentY = 0;

document.getElementById('scroll-capture').addEventListener('scroll', e => {
  scrollY = e.target.scrollTop;
  document.getElementById('hint').style.opacity = scrollY > 40 ? '0' : '1';
});

function tick() {
  currentY += (scrollY - currentY) * 0.1;
  const y  = currentY;
  const tc = TOP_CENTRE();   // 15vh en px
  const hc = H_CENTRE();     // 70vh en px

  /*
    Pour que le contenu soit seamless aux jonctions :
    
    plan-centre top=tc, affiche la bande depuis y.
    → b-centre : translateY(-y)
    
    plan-haut top=0, height=tc.
    Son bord BAS est à tc = jonction avec plan-centre.
    Son bord BAS doit montrer exactement ce que plan-centre montre en haut.
    plan-centre montre y en haut → plan-haut doit montrer y en bas de sa zone.
    Sa zone fait tc de haut, donc son haut = y - tc.
    → b-haut doit commencer à y - tc → translateY(-(y - tc)) = translateY(-y + tc)
    
    plan-bas top=tc+hc, height=tc.
    Son bord HAUT est à tc+hc = jonction avec plan-centre.
    Son bord HAUT doit montrer exactement ce que plan-centre montre en bas.
    plan-centre montre y+hc en bas → plan-bas doit montrer y+hc en haut.
    → b-bas doit commencer à y+hc → translateY(-(y + hc))
  */

  document.getElementById('b-haut').style.transform   = `translateY(${-y + tc}px)`;
  document.getElementById('b-centre').style.transform = `translateY(${-y}px)`;
  document.getElementById('b-bas').style.transform    = `translateY(${-y - hc}px)`;

  requestAnimationFrame(tick);
}

// Init spacer
document.getElementById('scroll-spacer').style.height =
  ((N - 1) * H_CENTRE() + vh()) + 'px';

tick();

window.addEventListener('resize', () => {
  document.getElementById('scroll-spacer').style.height =
    ((N - 1) * H_CENTRE() + vh()) + 'px';
});