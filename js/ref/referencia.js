/* referencia.js — Pinouts y referencia general */
export function init(c) {
  setupTabs(c);
  c.querySelectorAll('.pin-sel').forEach(b => {
    b.addEventListener('click', () => {
      c.querySelectorAll('.pin-sel').forEach(x=>x.classList.remove('active'));
      b.classList.add('active');
      renderPinout(b.dataset.pin);
    });
  });
  renderPinout('ne555');
}

function setupTabs(c) {
  c.querySelectorAll('.tab-btn').forEach(b=>b.addEventListener('click',()=>{
    c.querySelectorAll('.tab-btn').forEach(x=>x.classList.remove('active'));
    c.querySelectorAll('.tab-panel').forEach(x=>x.classList.remove('active'));
    b.classList.add('active'); document.getElementById('tab-'+b.dataset.tab)?.classList.add('active');
  }));
}

const PINOUTS = {
  ne555: {
    pkg: 'DIP-8', desc: 'Temporizador/Oscilador', datasheet: 'NE555',
    pins: [
      {n:1, name:'GND',    desc:'Tierra (0V)'},
      {n:2, name:'TRIG',   desc:'Disparo — comparador 1/3 Vcc'},
      {n:3, name:'OUT',    desc:'Salida (puede suministrar/absorber 200mA)'},
      {n:4, name:'/RST',   desc:'Reset activo bajo — normalmente a Vcc'},
      {n:5, name:'CTRL',   desc:'Control voltaje (punto medio del divisor interno, 2/3 Vcc)'},
      {n:6, name:'THR',    desc:'Umbral — comparador 2/3 Vcc'},
      {n:7, name:'DIS',    desc:'Descarga — colector abierto interno'},
      {n:8, name:'Vcc',    desc:'Alimentación (4.5V–16V, LMC555 hasta 15V)'},
    ],
    notes:'VCC: 5–16V (NE555), 1.5–15V (LMC555 CMOS). Desacoplar Vcc con 10nF a 100nF.'
  },
  lm317: {
    pkg: 'TO-220', desc: 'Regulador lineal ajustable positivo', datasheet: 'LM317',
    pins: [
      {n:1, name:'ADJ',    desc:'Ajuste — conectar divisor R1/R2 aquí'},
      {n:2, name:'OUT',    desc:'Salida regulada'},
      {n:3, name:'IN',     desc:'Entrada (Vin ≥ Vout + 3V)'},
    ],
    notes:'Vout = 1.25 × (1 + R2/R1). R1 típico 240Ω. Vin_max = 40V. Corriente max 1.5A con disipador.'
  },
  lm358: {
    pkg: 'DIP-8', desc: 'Doble amplificador operacional', datasheet: 'LM358',
    pins: [
      {n:1, name:'OUT1',   desc:'Salida Op-Amp 1'},
      {n:2, name:'IN1−',   desc:'Entrada inversora Op-Amp 1'},
      {n:3, name:'IN1+',   desc:'Entrada no inversora Op-Amp 1'},
      {n:4, name:'GND',    desc:'Tierra'},
      {n:5, name:'IN2+',   desc:'Entrada no inversora Op-Amp 2'},
      {n:6, name:'IN2−',   desc:'Entrada inversora Op-Amp 2'},
      {n:7, name:'OUT2',   desc:'Salida Op-Amp 2'},
      {n:8, name:'Vcc',    desc:'Alimentación (3–32V simple o ±1.5–16V dual)'},
    ],
    notes:'Single-supply, rail-to-rail input. GBW ≈ 1MHz. Puede trabajar desde GND. Slew rate ≈ 0.5 V/μs.'
  },
  lm741: {
    pkg: 'DIP-8', desc: 'Amplificador operacional clásico', datasheet: 'LM741',
    pins: [
      {n:1, name:'OFFSET N1', desc:'Compensación de offset'},
      {n:2, name:'IN−',       desc:'Entrada inversora'},
      {n:3, name:'IN+',       desc:'Entrada no inversora'},
      {n:4, name:'V−',        desc:'Tensión negativa (−Vcc)'},
      {n:5, name:'OFFSET N2', desc:'Compensación de offset'},
      {n:6, name:'OUT',       desc:'Salida'},
      {n:7, name:'V+',        desc:'Tensión positiva (+Vcc)'},
      {n:8, name:'N/C',       desc:'Sin conexión'},
    ],
    notes:'Requiere alimentación dual ±5V a ±22V. GBW=1MHz. Slew rate≈0.5V/μs. No rail-to-rail.'
  },
  bc547: {
    pkg: 'TO-92 (CBE)', desc: 'Transistor NPN de propósito general', datasheet: 'BC547',
    pins: [
      {n:1, name:'C',    desc:'Colector — Vceo max 45V'},
      {n:2, name:'B',    desc:'Base — VBE ≈ 0.7V'},
      {n:3, name:'E',    desc:'Emisor'},
    ],
    notes:'hFE 110–800. Ic_max 100mA. Pt_max 500mW. Complemento PNP: BC557. Orientación: plano hacia tí → C-B-E izquierda a derecha.'
  },
  irf540: {
    pkg: 'TO-220 (GDS)', desc: 'MOSFET N-canal de potencia', datasheet: 'IRF540',
    pins: [
      {n:1, name:'G',    desc:'Gate (Puerta) — Vgs_th ≈ 4V'},
      {n:2, name:'D',    desc:'Drain (Drenador) — Vdss 100V'},
      {n:3, name:'S',    desc:'Source (Fuente) — conectar a GND'},
    ],
    notes:'Id_max 33A. RDS(on) 77mΩ. Pd 150W (con disipador). Vgs max ±20V. Usar resistencia gate 10–100Ω.'
  },
  '7805': {
    pkg: 'TO-220', desc: 'Regulador de 5V fijo (78xx)', datasheet: 'LM7805',
    pins: [
      {n:1, name:'IN',   desc:'Entrada (7–35V recomendado)'},
      {n:2, name:'GND',  desc:'Tierra / común'},
      {n:3, name:'OUT',  desc:'Salida 5V regulada (1A)'},
    ],
    notes:'Dropout ~2.5V → Vin mínimo 7.5V. Agregar 0.33μF en entrada y 0.1μF en salida. Para 78xx/79xx cambiar OUT según modelo.'
  },
  atmega328: {
    pkg: 'DIP-28', desc: 'Microcontrolador AVR 8-bit (Arduino Uno)', datasheet: 'ATmega328P',
    pins: [
      {n:1, name:'PC6/RESET', desc:'Reset activo bajo'},
      {n:2, name:'PD0/RXD',   desc:'Digital 0 / RX UART'},
      {n:3, name:'PD1/TXD',   desc:'Digital 1 / TX UART'},
      {n:4, name:'PD2/INT0',  desc:'Digital 2 / Interrupción 0'},
      {n:5, name:'PD3/INT1',  desc:'Digital 3 / PWM / Interrupción 1'},
      {n:6, name:'PD4/T0',    desc:'Digital 4'},
      {n:7, name:'Vcc',       desc:'Alimentación 2.7–5.5V'},
      {n:8, name:'GND',       desc:'Tierra'},
      {n:9, name:'PB6/XTAL1',desc:'Cristal / OSC'},
      {n:10,name:'PB7/XTAL2',desc:'Cristal / OSC'},
      {n:11,name:'PD5/T1',   desc:'Digital 5 / PWM'},
      {n:12,name:'PD6/AIN0', desc:'Digital 6 / PWM'},
      {n:13,name:'PD7/AIN1', desc:'Digital 7'},
      {n:14,name:'PB0',      desc:'Digital 8'},
      {n:15,name:'PB1/OC1A', desc:'Digital 9 / PWM'},
      {n:16,name:'PB2/OC1B', desc:'Digital 10 / PWM / SS SPI'},
      {n:17,name:'PB3/MOSI', desc:'Digital 11 / PWM / MOSI SPI'},
      {n:18,name:'PB4/MISO', desc:'Digital 12 / MISO SPI'},
      {n:19,name:'PB5/SCK',  desc:'Digital 13 / SCK SPI / LED'},
      {n:20,name:'AVCC',     desc:'Alimentación ADC (conectar a Vcc + filtro)'},
      {n:21,name:'AREF',     desc:'Referencia ADC externa'},
      {n:22,name:'GND',      desc:'Tierra ADC'},
      {n:23,name:'PC0/ADC0', desc:'A0 — Analógico 0'},
      {n:24,name:'PC1/ADC1', desc:'A1 — Analógico 1'},
      {n:25,name:'PC2/ADC2', desc:'A2 — Analógico 2'},
      {n:26,name:'PC3/ADC3', desc:'A3 — Analógico 3'},
      {n:27,name:'PC4/SDA',  desc:'A4 / SDA I²C'},
      {n:28,name:'PC5/SCL',  desc:'A5 / SCL I²C'},
    ],
    notes:'Velocidad máx 20MHz (5V), 8MHz (3.3V). Flash 32KB, SRAM 2KB, EEPROM 1KB. ADC 10-bit. 6 PWM. UART, SPI, I²C.'
  }
};

function renderPinout(id) {
  const data = PINOUTS[id];
  const el = document.getElementById('pinout-display');
  if (!data||!el) return;
  el.innerHTML = `
    <div style="margin-bottom:12px">
      <strong>${data.desc}</strong>
      <span class="badge badge-primary" style="margin-left:8px">${data.pkg}</span>
    </div>
    <div class="table-wrap"><table class="ref-table">
      <thead><tr><th>#</th><th>Pin</th><th>Descripción</th></tr></thead>
      <tbody>${data.pins.map(p=>`
        <tr>
          <td style="font-family:monospace;font-weight:700;color:var(--primary)">${p.n}</td>
          <td style="font-family:monospace;font-size:0.8rem;font-weight:700;color:var(--text);white-space:nowrap">${p.name}</td>
          <td>${p.desc}</td>
        </tr>`).join('')}
      </tbody>
    </table></div>
    <div class="alert alert-info" style="margin-top:12px">${data.notes}</div>`;
}
