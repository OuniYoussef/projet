"""
Invoice generation and PDF creation utilities
"""

from django.utils import timezone
from datetime import datetime, timedelta
from django.core.files.base import ContentFile
import io
from reportlab.lib.pagesizes import letter, A4
from reportlab.lib import colors
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer, PageBreak
from reportlab.lib.enums import TA_CENTER, TA_RIGHT, TA_LEFT
import uuid

from .models import Invoice, OrderAssignment, Order, Driver


def generate_invoice_number():
    """Generate a unique invoice number"""
    timestamp = datetime.now().strftime("%Y%m%d")
    random_suffix = str(uuid.uuid4().hex[:6]).upper()
    return f"INV-{timestamp}-{random_suffix}"


def create_invoice_for_assignment(order_assignment: OrderAssignment) -> Invoice:
    """
    Create an Invoice when an OrderAssignment is accepted by a driver
    """
    order = order_assignment.order
    driver = order_assignment.driver

    # Check if invoice already exists
    if hasattr(order_assignment, 'invoice'):
        return order_assignment.invoice

    # Get customer info from order
    customer_name = order.user.get_full_name() or order.user.username
    customer_email = order.user.email
    customer_address = f"{order.shipping_address}, {order.shipping_city}, {order.shipping_postal_code}"

    # Get driver/seller info
    seller_name = driver.user.get_full_name() or driver.user.username
    seller_email = driver.user.email
    seller_phone = driver.phone

    # Create invoice
    invoice = Invoice.objects.create(
        order_assignment=order_assignment,
        order=order,
        driver=driver,
        invoice_number=generate_invoice_number(),
        status='issued',
        customer_name=customer_name,
        customer_email=customer_email,
        customer_phone=order.user.profile.phone if hasattr(order.user, 'profile') else '',
        customer_address=customer_address,
        seller_name=seller_name,
        seller_email=seller_email,
        seller_phone=seller_phone,
        seller_address='',
        subtotal=order.subtotal,
        shipping_cost=order.shipping_cost,
        tax=0.0,  # Can be calculated based on your tax rules
        total=order.total,
        due_date=timezone.now().date() + timedelta(days=30)
    )

    return invoice


def generate_invoice_pdf(invoice: Invoice) -> bytes:
    """
    Generate a PDF file for an invoice using reportlab matching the exact format from the image
    Returns PDF content as bytes
    """

    # Create PDF in memory
    pdf_buffer = io.BytesIO()
    doc = SimpleDocTemplate(pdf_buffer, pagesize=A4, topMargin=0.4*inch, bottomMargin=0.4*inch, leftMargin=0.5*inch, rightMargin=0.5*inch)

    # Get styles
    styles = getSampleStyleSheet()

    # Title style - matches image
    title_style = ParagraphStyle(
        'CustomTitle',
        parent=styles['Heading1'],
        fontSize=28,
        textColor=colors.HexColor('#1a3a52'),
        spaceAfter=6,
        alignment=TA_CENTER,
        fontName='Helvetica-Bold'
    )

    # Invoice number and date style
    info_style = ParagraphStyle(
        'InfoStyle',
        parent=styles['Normal'],
        fontSize=9,
        textColor=colors.HexColor('#1a3a52'),
        spaceAfter=4,
        alignment=TA_CENTER
    )

    # From/To section title
    section_title_style = ParagraphStyle(
        'SectionTitle',
        parent=styles['Normal'],
        fontSize=10,
        fontName='Helvetica-Bold',
        textColor=colors.HexColor('#1a3a52'),
        spaceAfter=6
    )

    # Normal text
    normal_style = ParagraphStyle(
        'Normal',
        parent=styles['Normal'],
        fontSize=9,
        spaceAfter=4
    )

    # Build PDF content
    elements = []

    # Title
    elements.append(Paragraph("FACTURE", title_style))
    elements.append(Spacer(1, 0.15*inch))

    # Invoice number and date - centered
    invoice_info = f"<b>Numéro de Facture:</b> {invoice.invoice_number}<br/><b>Date:</b> {invoice.issued_at.strftime('%d/%m/%Y')}"
    elements.append(Paragraph(invoice_info, info_style))
    elements.append(Spacer(1, 0.2*inch))

    # From / To section - two column layout - DE is fixed, FACTURE À changes by client
    from_to_data = [
        ['DE:', 'FACTURE À:'],
        [
            "<b>HubShop</b><br/>Tunisia<br/>Tél: +216 XX XXX XXX<br/>Email: contact@hubshop.tn",
            f"<b>{invoice.customer_name}</b><br/>{invoice.customer_phone}<br/>Email: {invoice.customer_email}<br/>{invoice.customer_address}"
        ]
    ]
    from_to_table = Table(from_to_data, colWidths=[3.25*inch, 3.25*inch])
    from_to_table.setStyle(TableStyle([
        ('FONT', (0, 0), (-1, 0), 'Helvetica-Bold', 10),
        ('FONT', (0, 1), (-1, 1), 'Helvetica', 9),
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ('LEFTPADDING', (0, 0), (-1, -1), 0),
        ('RIGHTPADDING', (0, 0), (-1, -1), 0),
        ('TOPPADDING', (0, 0), (-1, -1), 0),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 0),
    ]))
    elements.append(from_to_table)
    elements.append(Spacer(1, 0.25*inch))

    # Order details title
    elements.append(Paragraph("Détails de la Commande:", section_title_style))

    # Order items table
    order_data = [
        ['Description', 'Quantité', 'Prix Unitaire', 'Montant'],
    ]

    # Add items from order items
    has_items = False
    for item in invoice.order.items.all():
        has_items = True
        order_data.append([
            item.product_name,
            str(item.quantity),
            f"{item.price:.2f} TND",
            f"{item.subtotal:.2f} TND"
        ])

    # If no items, add the order as a single line
    if not has_items:
        order_data.append([
            f"Commande #{invoice.order.order_number}",
            '1',
            f"{invoice.subtotal:.2f} TND",
            f"{invoice.subtotal:.2f} TND"
        ])

    order_table = Table(order_data, colWidths=[2.8*inch, 1*inch, 1.5*inch, 1.5*inch])
    order_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#1a5490')),  # Blue header matching image
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
        ('ALIGN', (0, 0), (-1, 0), 'CENTER'),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, 0), 9),
        ('BOTTOMPADDING', (0, 0), (-1, 0), 8),
        ('TOPPADDING', (0, 0), (-1, 0), 8),
        ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#cccccc')),
        ('ALIGN', (1, 1), (-1, -1), 'RIGHT'),
        ('ALIGN', (0, 1), (0, -1), 'LEFT'),
        ('FONTNAME', (0, 1), (-1, -1), 'Helvetica'),
        ('FONTSIZE', (0, 1), (-1, -1), 9),
        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, colors.HexColor('#f8f8f8')]),
        ('LEFTPADDING', (0, 0), (-1, -1), 6),
        ('RIGHTPADDING', (0, 0), (-1, -1), 6),
        ('TOPPADDING', (0, 1), (-1, -1), 6),
        ('BOTTOMPADDING', (0, 1), (-1, -1), 6),
    ]))
    elements.append(order_table)
    elements.append(Spacer(1, 0.15*inch))

    # Totals section - right aligned
    totals_data = [
        ['', 'Sous-total:', f"{invoice.subtotal:.2f} TND"],
        ['', 'Frais de Livraison:', f"{invoice.shipping_cost:.2f} TND"],
        ['', 'Taxe:', f"{invoice.tax:.2f} TND"],
        ['', 'TOTAL:', f"{invoice.total:.2f} TND"],
    ]
    totals_table = Table(totals_data, colWidths=[2.8*inch, 1.8*inch, 1.6*inch])
    totals_table.setStyle(TableStyle([
        ('ALIGN', (1, 0), (-1, -1), 'RIGHT'),
        ('FONTNAME', (1, 0), (-1, -3), 'Helvetica'),
        ('FONTNAME', (1, -1), (-1, -1), 'Helvetica-Bold'),
        ('FONTSIZE', (1, 0), (-1, -1), 9),
        ('TOPPADDING', (1, 0), (-1, -1), 4),
        ('BOTTOMPADDING', (1, 0), (-1, -1), 4),
    ]))
    elements.append(totals_table)
    elements.append(Spacer(1, 0.2*inch))

    # Payment method and status
    payment_method = getattr(invoice.order, 'payment_method', 'online')
    method_display = 'online' if payment_method == 'online' else payment_method

    elements.append(Paragraph(f"<b>Méthode de Paiement:</b> {method_display}", normal_style))
    elements.append(Paragraph(f"<b>Statut:</b> {invoice.get_status_display()}", normal_style))

    # Notes if any
    if hasattr(invoice, 'notes') and invoice.notes:
        elements.append(Spacer(1, 0.1*inch))
        elements.append(Paragraph(f"<b>Notes:</b> {invoice.notes}", normal_style))

    elements.append(Spacer(1, 0.15*inch))

    # Footer
    footer_text = "Merci pour votre commande! / Thank you for your order!<br/>Générée le {0}".format(
        datetime.now().strftime('%d/%m/%Y à %H:%M')
    )
    footer_style = ParagraphStyle(
        'Footer',
        parent=styles['Normal'],
        fontSize=8,
        textColor=colors.HexColor('#666666'),
        alignment=TA_CENTER
    )
    elements.append(Paragraph(footer_text, footer_style))

    # Build PDF
    doc.build(elements)

    # Get PDF content
    pdf_content = pdf_buffer.getvalue()
    pdf_buffer.close()

    return pdf_content


def save_invoice_pdf(invoice: Invoice):
    """
    Generate PDF and save it to the invoice model
    """
    pdf_content = generate_invoice_pdf(invoice)
    pdf_file_name = f"invoice_{invoice.invoice_number}.pdf"

    # Save PDF file
    invoice.pdf_file.save(
        pdf_file_name,
        ContentFile(pdf_content),
        save=True
    )

    return invoice.pdf_file
