// Gera o PDF de extrato usado nos testes. Os dados são fictícios de propósito:
// nenhum extrato real do grupo deve entrar no repositório.
//
// Uso: node backend/tests/fixtures/make-sample-statement.mjs

import { writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const LINES = [
  "Associado: GRUPO ESCOTEIRO EXEMPLO",
  "Cooperativa: 0000",
  "Conta: 00000-0",
  "Extrato (Período de 01/01/2026 a 31/01/2026)",
  "Data Descrição Documento Valor (R$) Saldo (R$)",
  "SALDO ANTERIOR 25,77",
  "05/01/2026 RECEBIMENTO PIX 11111111111 JOANA EXEMPLO PIX_CRED 60,00 85,77",
  "Sicredi Fone 0800 724 4770",
  "SAC 0800 724 7220",
  "Ouvidoria 0800 646 2519",
];

const escape = (text) => text.replace(/([\\()])/g, "\\$1");

const content =
  ["BT", "/F1 11 Tf", "40 790 Td", "16 TL"]
    .concat(LINES.map((line) => `(${escape(line)}) Tj T*`))
    .concat(["ET"])
    .join("\n") + "\n";

const objects = [
  "<< /Type /Catalog /Pages 2 0 R >>",
  "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
  "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] " +
    "/Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>",
  "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>",
  `<< /Length ${Buffer.byteLength(content, "latin1")} >>\nstream\n${content}endstream`,
];

let pdf = "%PDF-1.4\n";
const offsets = [];
objects.forEach((body, index) => {
  offsets.push(Buffer.byteLength(pdf, "latin1"));
  pdf += `${index + 1} 0 obj\n${body}\nendobj\n`;
});

const startxref = Buffer.byteLength(pdf, "latin1");
pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
for (const offset of offsets) {
  pdf += `${String(offset).padStart(10, "0")} 00000 n \n`;
}
pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${startxref}\n%%EOF\n`;

const target = join(dirname(fileURLToPath(import.meta.url)), "extrato-exemplo.pdf");
writeFileSync(target, Buffer.from(pdf, "latin1"));
console.log(`Extrato de exemplo gerado em ${target}`);
