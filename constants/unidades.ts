// Lista mestra de unidades de medida disponíveis para as ações/desafios.
// Usada tanto no backoffice (escolher quais são permitidas por desafio) como na
// app (mostrar ao utilizador só as unidades permitidas para aquele desafio).

export const UNIDADES = [
  "Unidades",
  "Kg", "Gramas",
  "Litros", "Ml",
  "Km", "Metros",
  "Garrafa pequena (0,33L)", "Garrafa média (0,5L)", "Garrafa grande (1,5L)",
  "Embalagem pequena", "Embalagem média", "Embalagem grande",
  "Horas", "Minutos",
];

export const normUnidade = (u?: string) => (u || "").trim().toLowerCase();
