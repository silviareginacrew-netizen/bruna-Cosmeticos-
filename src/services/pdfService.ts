import { jsPDF } from 'jspdf';
import { Sale, Consortium, Installment, Product } from '../types';

export const generateReceipt = (sale: Sale) => {
  const doc = new jsPDF({
    unit: 'mm',
    format: [80, 150] // Receipt printer format
  });

  const premiumPink = [255, 182, 193];
  
  // Header
  doc.setFont('times', 'italic');
  doc.setFontSize(28);
  doc.setTextColor(255, 182, 193); // Pink BC
  doc.text('BC', 40, 15, { align: 'center' });
  
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(100, 100, 100);
  doc.text('BRUNA COSMÉTICOS', 40, 22, { align: 'center', charSpace: 2 });
  
  doc.setDrawColor(255, 182, 193);
  doc.setLineWidth(0.1);
  doc.line(15, 25, 65, 25);
  
  // Content
  doc.setTextColor(0, 0, 0);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.text(`DATA: ${new Date(sale.date).toLocaleDateString('pt-BR')}`, 10, 32);
  doc.text(`CLIENTE: ${(sale.clientName || 'Consumidor').toUpperCase()}`, 10, 37);
  
  doc.setDrawColor(240, 240, 240);
  doc.line(10, 41, 70, 41);
  
  doc.setFont('helvetica', 'bold');
  doc.text('DESCRIÇÃO', 10, 46);
  doc.text('TOTAL', 60, 46);
  
  doc.setFont('helvetica', 'normal');
  doc.text(`${sale.quantity}x ${sale.productName.slice(0, 18)}...`, 10, 52);
  doc.text(`R$ ${sale.totalValue.toFixed(2)}`, 60, 52);
  
  doc.line(10, 58, 70, 58);
  
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text('TOTAL FINAL:', 10, 68);
  doc.text(`R$ ${sale.totalValue.toFixed(2)}`, 60, 68);
  
  doc.setFontSize(7);
  doc.setFont('helvetica', 'italic');
  doc.setTextColor(150, 150, 150);
  doc.text('Sua beleza merece o melhor.', 40, 85, { align: 'center' });
  doc.text('Obrigada pela confiança!', 40, 89, { align: 'center' });
  
  doc.save(`recibo_bc_${sale.id.slice(0,5)}.pdf`);
};

export const generateConsortiumPDF = (consortium: Consortium, installments: Installment[]) => {
  const doc = new jsPDF();
  const pink = [255, 182, 193];
  
  doc.setFont('times', 'italic');
  doc.setFontSize(32);
  doc.setTextColor(pink[0], pink[1], pink[2]);
  doc.text('BC', 105, 15, { align: 'center' });
  
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(150, 150, 150);
  doc.text('BRUNA COSMÉTICOS', 105, 22, { align: 'center', charSpace: 3 });
  
  doc.setDrawColor(pink[0], pink[1], pink[2]);
  doc.setLineWidth(0.1);
  doc.line(70, 25, 140, 25);
  
  doc.setTextColor(0, 0, 0);
  doc.setFontSize(14);
  doc.text('CARNÊ DE PAGAMENTO EXCLUSIVO', 105, 35, { align: 'center' });
  
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(`TITULAR: ${consortium.clientName.toUpperCase()}`, 20, 45);
  doc.text(`VALOR ACORDADO: R$ ${consortium.totalValue.toFixed(2)}`, 20, 50);
  doc.text(`CONTRATO DATA: ${new Date(consortium.startDate || consortium.createdAt).toLocaleDateString('pt-BR')}`, 140, 45);
  
  let y = 65;
  installments.forEach((ins, index) => {
    if (y > 250) {
      doc.addPage();
      y = 20;
    }
    
    // Luxury Coupon
    doc.setFillColor(250, 250, 250);
    doc.rect(20, y, 170, 35, 'F');
    doc.setDrawColor(pink[0], pink[1], pink[2]);
    doc.setLineWidth(0.2);
    doc.rect(20, y, 170, 35);
    
    doc.setDrawColor(230, 230, 230);
    doc.line(65, y, 65, y + 35);
    
    // Left side (stub)
    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(pink[0], pink[1], pink[2]);
    doc.text(`COTA ${ins.number}/${consortium.installmentsCount}`, 25, y + 7);
    
    doc.setTextColor(100, 100, 100);
    doc.setFont('helvetica', 'normal');
    doc.text('VENCIMENTO', 25, y + 15);
    doc.setTextColor(0, 0, 0);
    doc.text(new Date(ins.dueDate).toLocaleDateString('pt-BR'), 25, y + 20);
    
    doc.setFont('helvetica', 'bold');
    doc.text(`R$ ${ins.value.toFixed(2)}`, 25, y + 28);
    
    // Right side (main part)
    doc.setFontSize(10);
    doc.setTextColor(pink[0], pink[1], pink[2]);
    doc.text('BRUNA COSMÉTICOS', 70, y + 10);
    
    doc.setTextColor(100, 100, 100);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.text(`Beneficiário: Bruna Cosméticos`, 70, y + 18);
    doc.text(`Pagador: ${consortium.clientName}`, 70, y + 24);
    doc.text(`Referência: Parcela ${ins.number} de ${consortium.installmentsCount}`, 70, y + 30);
    
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.setTextColor(0, 0, 0);
    doc.text(`VENC: ${new Date(ins.dueDate).toLocaleDateString('pt-BR')}`, 135, y + 18);
    doc.text(`TOTAL: R$ ${ins.value.toFixed(2)}`, 135, y + 25);
    
    y += 42;
  });
  
  doc.save(`carne_${consortium.clientName.replace(/\s+/g, '_')}.pdf`);
};
