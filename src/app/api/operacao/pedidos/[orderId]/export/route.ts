import ExcelJS from "exceljs";
import PDFDocument from "pdfkit";
import { getCompanyOrderDetails } from "@/modules/admin/admin.actions";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

function money(value: number) {
  return (value / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

async function authorizedExport() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return false;
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle();
  return profile?.role === "PLATFORM_ADMIN" || profile?.role === "INTERNAL_OPERATOR";
}

export async function GET(request: Request, { params }: { params: Promise<{ orderId: string }> }) {
  if (!(await authorizedExport())) return new Response("Acesso não autorizado", { status: 403 });
  const { orderId } = await params;
  const details = await getCompanyOrderDetails(orderId);
  if (!details.ok) return new Response(details.message, { status: details.message === "Pedido não encontrado." ? 404 : 403 });
  const url = new URL(request.url);
  const format = url.searchParams.get("format") === "pdf" ? "pdf" : "xlsx";
  const order = details.order;
  const filename = `pedido-${order.orderNumber}`;

  if (format === "pdf") {
    const document = new PDFDocument({ size: "A4", margin: 44 });
    const chunks: Buffer[] = [];
    const buffer = new Promise<Buffer>((resolve, reject) => {
      document.on("data", chunk => chunks.push(Buffer.from(chunk)));
      document.on("end", () => resolve(Buffer.concat(chunks)));
      document.on("error", reject);
    });
    document.fontSize(20).fillColor("#163c2d").text("Farta — Pedido");
    document.moveDown(0.5).fontSize(14).fillColor("#17231d").text(`#${order.orderNumber} · ${order.status}`);
    document.fontSize(10).fillColor("#55635b").text(`${order.companyName} · ${order.establishmentName}`);
    document.text(new Date(order.createdAt).toLocaleString("pt-BR"));
    document.moveDown(0.5).fontSize(10).fillColor("#55635b").text(`Observações: ${order.customerNote || "Nenhuma observação informada"}`);
    document.moveDown().fontSize(13).fillColor("#17231d").text("Itens do pedido");
    for (const item of order.items) {
      document.moveDown(0.35).fontSize(10).text(`${item.quantity}×  ${item.productName} — ${item.variantName} (${item.unit})`);
      document.fillColor("#55635b").text(`SKU: ${item.skuCode ?? "—"} · Unitário: ${money(item.unitPriceMinor)} · Subtotal: ${money(item.subtotalMinor)}`);
      document.fillColor("#17231d");
    }
    document.moveDown().fontSize(12).text(`Total: ${money(order.totalMinor)}`);
    document.end();
    return new Response(new Uint8Array(await buffer), { headers: { "Content-Type": "application/pdf", "Content-Disposition": `attachment; filename="${filename}.pdf"` } });
  }

  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet("Pedido");
  sheet.columns = [
    { header: "Pedido", key: "order", width: 12 }, { header: "Empresa", key: "company", width: 28 },
    { header: "Estabelecimento", key: "establishment", width: 28 }, { header: "Status", key: "status", width: 22 },
    { header: "Data", key: "createdAt", width: 22 }, { header: "Observações", key: "customerNote", width: 42 }, { header: "Produto", key: "product", width: 32 },
    { header: "Marca", key: "brand", width: 20 }, { header: "Variante", key: "variant", width: 25 },
    { header: "Unidade", key: "unit", width: 16 }, { header: "SKU", key: "sku", width: 18 },
    { header: "Quantidade", key: "quantity", width: 14 }, { header: "Preço unitário", key: "unitPrice", width: 18 },
    { header: "Subtotal", key: "subtotal", width: 16 }, { header: "Total do pedido", key: "total", width: 18 },
  ];
  for (const item of order.items) sheet.addRow({ order: order.orderNumber, company: order.companyName, establishment: order.establishmentName, status: order.status, createdAt: new Date(order.createdAt).toLocaleString("pt-BR"), customerNote: order.customerNote || "Nenhuma observação informada", product: item.productName, brand: item.brand ?? "", variant: item.variantName, unit: item.unit, sku: item.skuCode ?? "", quantity: item.quantity, unitPrice: money(item.unitPriceMinor), subtotal: money(item.subtotalMinor), total: money(order.totalMinor) });
  sheet.getRow(1).font = { bold: true, color: { argb: "FFFFFFFF" } };
  sheet.getRow(1).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF163C2D" } };
  const xlsx = await workbook.xlsx.writeBuffer();
  return new Response(xlsx, { headers: { "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", "Content-Disposition": `attachment; filename="${filename}.xlsx"` } });
}
