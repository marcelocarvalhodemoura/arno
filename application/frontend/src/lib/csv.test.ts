import { describe, expect, it } from "vitest";
import { mapMemberRow, mapTxRow, parseCsv, parseIsoDate, parseBranch, parseTxType } from "./csv";

const csv = `nome;email;telefone;ramo;papel;mensalidade;ingresso;clube_ltc
João da Silva;joao.silva@arnofriedrich.org.br;(51) 99999-1111;Escoteiro;jovem;60,00;01/03/2026;não
`;

describe("parseCsv", () => {
  it("reads semicolon CSV with Brazilian headers", () => {
    const table = parseCsv(csv);
    expect(table.headers).toContain("nome");
    expect(table.rows).toHaveLength(1);
    expect(table.rows[0]?.nome).toBe("João da Silva");
  });

  it("keeps quoted commas and accepts comma-separated files", () => {
    const table = parseCsv(`nome,email\n"Silva, João",joao@arnofriedrich.org.br\n`);
    expect(table.rows[0]?.nome).toBe("Silva, João");
    expect(table.rows[0]?.email).toBe("joao@arnofriedrich.org.br");
  });
});

describe("parsers", () => {
  it("converts BR dates and branch labels", () => {
    expect(parseIsoDate("01/03/2026")).toBe("2026-03-01");
    expect(parseIsoDate("2026-03-01")).toBe("2026-03-01");
    expect(parseBranch("Filhotes")).toBe("filhote");
    expect(parseBranch("Flor de Lis")).toBe("flor-de-lis");
    expect(parseTxType("Entrada")).toBe("income");
    expect(parseTxType("Saída")).toBe("expense");
  });
});

describe("mapMemberRow", () => {
  it("maps a valid associate row", () => {
    const table = parseCsv(csv);
    const mapped = mapMemberRow(table.rows[0]!);
    expect(mapped.ok).toBe(true);
    if (mapped.ok) {
      expect(mapped.value.branch).toBe("escoteiro");
      expect(mapped.value.monthlyFee).toBe(89.5);
      expect(mapped.value.joinedAt).toBe("2026-03-01");
      expect(mapped.value.clubeLtc).toBe(false);
    }
  });

  it("maps a responsible on launched associate rows", () => {
    const mapped = mapMemberRow({
      nome: "Ana Souza",
      email: "ana.souza@arnofriedrich.org.br",
      telefone: "(51) 99999-1001",
      ramo: "lobinho",
      papel: "jovem",
      mensalidade: "55,00",
      ingresso: "11/03/2023",
      clube_ltc: "não",
      responsavel: "Helena Souza",
      parentesco: "Mãe",
    });
    expect(mapped.ok).toBe(true);
    if (mapped.ok) {
      expect(mapped.value.guardians?.[0]?.name).toBe("Helena Souza");
      expect(mapped.value.guardians?.[0]?.relationship).toBe("Mãe");
    }
  });

  it("maps two responsibles on the same associate row", () => {
    const mapped = mapMemberRow({
      nome: "Ana Souza",
      email: "ana.souza@arnofriedrich.org.br",
      telefone: "(51) 99999-1001",
      ramo: "lobinho",
      papel: "jovem",
      mensalidade: "55,00",
      ingresso: "11/03/2023",
      clube_ltc: "não",
      responsavel: "Helena Souza",
      parentesco: "Mãe",
      telefone_responsavel: "(51) 99999-1002",
      email_responsavel: "helena.souza@arnofriedrich.org.br",
      responsavel_2: "Carlos Souza",
      parentesco_2: "Pai",
      telefone_responsavel_2: "(51) 99999-1003",
    });
    expect(mapped.ok).toBe(true);
    if (mapped.ok) {
      expect(mapped.value.guardians).toHaveLength(2);
      expect(mapped.value.guardians?.[0]?.name).toBe("Helena Souza");
      expect(mapped.value.guardians?.[0]?.relationship).toBe("Mãe");
      expect(mapped.value.guardians?.[1]?.name).toBe("Carlos Souza");
      expect(mapped.value.guardians?.[1]?.relationship).toBe("Pai");
    }
  });

  it("rejects a row without e-mail", () => {
    const mapped = mapMemberRow({
      nome: "Sem e-mail",
      email: "",
      telefone: "(51) 99999-0000",
      ramo: "escoteiro",
      papel: "jovem",
      mensalidade: "60,00",
      ingresso: "01/03/2026",
      clube_ltc: "não",
    });
    expect(mapped.ok).toBe(false);
  });
});

describe("mapTxRow", () => {
  it("matches movement type and member by name", () => {
    const table = parseCsv(`data;tipo;natureza;tipo_movimentacao;descricao;valor;ramo;meio;situacao;associado
14/09/2026;entrada;variável;Doação;Doação Pix;150,00;grupo;pix;pago;Ana Souza
`);
    const mapped = mapTxRow(table.rows[0]!, {
      movementTypes: [{ id: "mt1", name: "Doação", direction: "income" }],
      members: [{ id: "m1", name: "Ana Souza" }],
    });
    expect(mapped.ok).toBe(true);
    if (mapped.ok) {
      expect(mapped.value.movementTypeId).toBe("mt1");
      expect(mapped.value.memberId).toBe("m1");
      expect(mapped.value.amount).toBe(150);
      expect(mapped.value.date).toBe("2026-09-14");
    }
  });
});
