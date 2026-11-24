using QRCoder;
using QuestPDF.Fluent;
using QuestPDF.Helpers;
using QuestPDF.Infrastructure;
using Staj.Application.Common;
using Staj.Domain.Entities;
using Staj.Domain.Enums;

namespace Staj.Infrastructure.Services;

/// <summary>
/// QuestPDF kullanarak resmi Form 2 (Staj Kabul Formu - TF-BM-SF-02) ve Sanal Staj Defteri PDF'lerini üretir.
/// </summary>
public class QuestPdfService : IPdfService
{
    private static readonly byte[]? UniversityLogoBytes;

    static QuestPdfService()
    {
        QuestPDF.Settings.License = LicenseType.Community;
        UniversityLogoBytes = TryLoadLogo();
    }

    private static byte[] GenerateQrPng(string text)
    {
        using var gen = new QRCodeGenerator();
        using var data = gen.CreateQrCode(text, QRCodeGenerator.ECCLevel.Q);
        using var qr = new PngByteQRCode(data);
        return qr.GetGraphic(5);
    }

    private static byte[]? TryLoadLogo()
    {
        var baseDirs = new[] { Directory.GetCurrentDirectory(), AppContext.BaseDirectory };
        var relativePaths = new[]
        {
            Path.Combine("wwwroot", "selcuk-amblem.png"),
            Path.Combine("..", "..", "frontend", "public", "selcuk-amblem.png"),
            Path.Combine("..", "..", "frontend", "public", "rapor-media1.png"),
            Path.Combine("..", "..", "..", "formlar", "selcuküniamblem.png"),
            "selcuk-amblem.png"
        };

        foreach (var baseDir in baseDirs)
        {
            foreach (var rel in relativePaths)
            {
                try
                {
                    var full = Path.GetFullPath(Path.Combine(baseDir, rel));
                    if (File.Exists(full))
                        return File.ReadAllBytes(full);
                }
                catch
                {
                    // Yoksay
                }
            }
        }
        return null;
    }

    /// <inheritdoc />
    public byte[] GenerateForm2(Internship i)
    {
        var isStaj1 = i.Type == InternshipType.Staj1;
        var isStaj2 = i.Type == InternshipType.Staj2;
        var studentDept = string.IsNullOrWhiteSpace(i.Student?.Department)
            ? "Teknoloji Fakültesi / Bilgisayar Mühendisliği"
            : $"Teknoloji Fakültesi - {i.Student.Department}";
        var studentNo = i.Student?.StudentNo ?? "-";
        var workTopic = !string.IsNullOrWhiteSpace(i.Subject)
            ? i.Subject!
            : (!string.IsNullOrWhiteSpace(i.Department) ? i.Department! : "Yazılım / Bilgisayar Mühendisliği Uygulamaları");
        var advisorGradDept = !string.IsNullOrWhiteSpace(i.AdvisorGraduatedDepartment)
            ? i.AdvisorGraduatedDepartment!
            : (!string.IsNullOrWhiteSpace(i.Department) ? i.Department! : "Mühendislik / İlgili Birim");
        var advisorRoleText = !string.IsNullOrWhiteSpace(i.AdvisorTitle)
            ? $"{i.AdvisorTitle} ({i.AdvisorEmail})"
            : $"İşyeri Staj Danışmanı / Yetkilisi ({i.AdvisorEmail})";
        var advisorSignName = !string.IsNullOrWhiteSpace(i.AdvisorTitle)
            ? $"{i.AdvisorTitle} — {i.AdvisorName}"
            : i.AdvisorName;
        var companyAddress = string.Join(" / ",
            new[] { i.Company?.Address, i.Company?.City }.Where(s => !string.IsNullOrWhiteSpace(s)));
        var companyContact = string.Join(" / ",
            new[] { i.Company?.Phone, !string.IsNullOrWhiteSpace(i.Company?.Email) ? i.Company!.Email : i.AdvisorEmail }
                .Where(s => !string.IsNullOrWhiteSpace(s)));

        var doc = QuestPDF.Fluent.Document.Create(container =>
        {
            container.Page(page =>
            {
                page.Size(PageSizes.A4);
                page.MarginVertical(20);
                page.MarginHorizontal(26);
                page.DefaultTextStyle(x => x.FontSize(8.5f).FontColor(Colors.Black));

                // =============================================================
                //  ÜST BAŞLIK TABLOSU (form2_staj_kabul_formu.docx Header)
                // =============================================================
                page.Header().Table(t =>
                {
                    t.ColumnsDefinition(c =>
                    {
                        c.ConstantColumn(85);
                        c.RelativeColumn();
                        c.ConstantColumn(145);
                    });

                    // Sol Hücre: Üniversite Amblemi
                    t.Cell().Border(0.75f).BorderColor(Colors.Black).Padding(4).AlignCenter().AlignMiddle().Element(cell =>
                    {
                        if (UniversityLogoBytes is { Length: > 0 })
                        {
                            cell.Height(52).Image(UniversityLogoBytes).FitArea();
                        }
                        else
                        {
                            cell.Column(col =>
                            {
                                col.Item().AlignCenter().Text("T.C.").Bold().FontSize(8);
                                col.Item().AlignCenter().Text("SELÇUK ÜNİVERSİTESİ").Bold().FontSize(7.5f);
                                col.Item().AlignCenter().Text("TEKNOLOJİ FAKÜLTESİ").FontSize(7);
                            });
                        }
                    });

                    // Orta Hücre: Kurum Başlığı
                    t.Cell().Border(0.75f).BorderColor(Colors.Black).Padding(4).AlignCenter().AlignMiddle().Column(col =>
                    {
                        col.Spacing(1);
                        col.Item().AlignCenter().Text("T.C.").Bold().FontSize(10);
                        col.Item().AlignCenter().Text("SELÇUK ÜNİVERSİTESİ").Bold().FontSize(10);
                        col.Item().AlignCenter().Text("TEKNOLOJİ FAKÜLTESİ").Bold().FontSize(10);
                        col.Item().AlignCenter().Text("BİLGİSAYAR MÜHENDİSLİĞİ BÖLÜMÜ").Bold().FontSize(9.5f);
                    });

                    // Sağ Hücre: FORM-2 Doküman Bilgileri Tablosu
                    t.Cell().Border(0.75f).BorderColor(Colors.Black).Table(meta =>
                    {
                        meta.ColumnsDefinition(mc =>
                        {
                            mc.ConstantColumn(68);
                            mc.RelativeColumn();
                        });

                        meta.Cell().ColumnSpan(2).BorderBottom(0.5f).BorderColor(Colors.Black)
                            .PaddingVertical(2).AlignCenter().Text("FORM-2").Bold().FontSize(9.5f);

                        MetaRow(meta, "Doküman No", "TF-BM-SF-02");
                        MetaRow(meta, "Revizyon Tarihi", "02.05.2024");
                        MetaRow(meta, "Revizyon No", "08");
                        MetaRow(meta, "Sayfa No", "1 / 1", isLast: true);
                    });
                });

                // =============================================================
                //  ANA GÖVDE TABLOSU (form2_staj_kabul_formu.docx Body)
                // =============================================================
                page.Content().PaddingTop(6).Table(t =>
                {
                    t.ColumnsDefinition(c =>
                    {
                        c.ConstantColumn(135); // Sol etiket sütunu
                        c.RelativeColumn();    // Orta değer sütunu
                        c.ConstantColumn(85);  // Sağ fotoğraf / imza sütunu
                    });

                    // Başlık Satırı + Sağ Üst Fotoğraf Kutusu (RowSpan 7)
                    t.Cell().ColumnSpan(2).Border(0.75f).BorderColor(Colors.Black)
                        .Background(Colors.Grey.Lighten3).PaddingVertical(4).PaddingHorizontal(6)
                        .AlignCenter().AlignMiddle().Text("STAJ KABUL FORMU").Bold().FontSize(10.5f);

                    t.Cell().RowSpan(7).Border(0.75f).BorderColor(Colors.Black)
                        .Padding(4).AlignCenter().AlignMiddle().Column(col =>
                        {
                            col.Item().AlignCenter().Text("FOTOĞRAF").Bold().FontSize(7.5f).FontColor(Colors.Grey.Darken1);
                            col.Item().PaddingTop(2).AlignCenter().Text("(Son 6 ay içinde").FontSize(6.5f).FontColor(Colors.Grey.Darken1);
                            col.Item().AlignCenter().Text("çekilmiş)").FontSize(6.5f).FontColor(Colors.Grey.Darken1);
                        });

                    // 1. ÖĞRENCİNİN BİLGİLERİ
                    t.Cell().ColumnSpan(2).Border(0.75f).BorderColor(Colors.Black)
                        .Background(Colors.Grey.Lighten4).PaddingVertical(2.5f).PaddingHorizontal(6)
                        .Text("ÖĞRENCİNİN").Bold().FontSize(8.5f);

                    FormRow2Col(t, "Adı ve Soyadı", i.Student?.FullName ?? "-");
                    FormRow2Col(t, "Fakülte Sınıf / Öğrenci No.", $"{studentDept} / {studentNo}");
                    FormRow2Col(t, "T.C. Kimlik Numarası", i.Student?.NationalId ?? "-");
                    FormRow2Col(t, "Cep Telefonu / Ev Telefonu", i.Student?.Phone ?? "-");
                    FormRow2Col(t, "İletişim Adresi (E-Posta)", i.Student?.Email ?? "-");

                    // 2. YAPACAĞI STAJIN BİLGİLERİ
                    SectionBanner(t, "YAPACAĞI STAJIN");

                    FormRow3Col(t, "Türü",
                        $":   [ {(isStaj1 ? "X" : " ")} ] Staj-1                    [ {(isStaj2 ? "X" : " ")} ] Staj-2");

                    FormRow3Col(t, "Konusu / Süresi (İş Günü)",
                        $":   {workTopic}   /   {i.WorkDays} İş Günü          Cumartesi Dahil Mi? :   [ {(i.WorksOnSaturday ? "X" : " ")} ] Evet     [ {(!i.WorksOnSaturday ? "X" : " ")} ] Hayır");

                    FormRow3Col(t, "Staj Başlama ve Bitiş Tarihi",
                        $":   {i.StartDate:dd / MM / yyyy}   -   {i.EndDate:dd / MM / yyyy}");

                    // 3. ÖĞRENCİ BEYAN VE TAAHHÜTNAMESİ
                    SectionBanner(t, "Öğrenci Beyan ve Taahhütnamesi");

                    DeclarationOptionRow(t,
                        "Ailemden Annem / Babam üzerinden Genel sağlık sigortası kapsamında sağlık hizmeti alıyorum. Bu nedenle mesleki uygulama boyunca genel sağlık sigortası kapsamında olmayı kabul etmiyorum. (İŞ VE KAZA SİGORTASI)");

                    DeclarationOptionRow(t,
                        "Ailemden Annem / Babam üzerinden Genel sağlık sigortası kapsamında sağlık hizmeti almıyorum. Bu nedenle mesleki uygulama boyunca genel sağlık sigortası kapsamında olmayı kabul ediyorum. (GENEL SİGORTA)");

                    DeclarationOptionRow(t,
                        "Kamu / özel sektörde çalışmamdan dolayı genel sağlık sigortası kapsamında sağlık hizmeti alıyorum. Bu nedenle staj / işyeri eğitimim süresince genel sağlık sigortası kapsamında olmayı kabul etmiyorum.");

                    t.Cell().ColumnSpan(3).Border(0.75f).BorderColor(Colors.Black).Padding(5).Column(col =>
                    {
                        col.Spacing(2.5f);
                        col.Item().Text(
                            $"- Yukarıda belirtilen tarihler arasında 5510 Sayılı Kanun’un 5/b maddesi uyarınca {i.WorkDays} iş günlük stajımı yapacağım.")
                            .FontSize(8f);
                        col.Item().Text(
                            "- Yukarıda işaretlediğim beyanın doğruluğunu, beyan ettiğim durumumda herhangi bir değişiklik olması halinde değişikliği derhal tarafınıza bildireceğimi kabul eder, beyanımın hatalı veya eksik olmasından kaynaklanacak her türlü prim, idari ceza, gecikme zammı ve gecikme faizinin tarafımca ödeneceğini taahhüt ederim.")
                            .FontSize(8f);
                        col.Item().PaddingTop(4).Row(r =>
                        {
                            r.RelativeItem().Text("");
                            r.ConstantItem(170).Column(sc =>
                            {
                                sc.Item().AlignCenter().Text($"{DateTime.Now:dd / MM / yyyy}").FontSize(8f);
                                sc.Item().AlignCenter().Text("Öğrencinin İmzası").Bold().FontSize(8f);
                                sc.Item().PaddingTop(8).AlignCenter().Text(i.Student?.FullName ?? "").FontSize(8f);
                            });
                        });
                    });

                    // 4. BÖLÜM VE FAKÜLTE ONAY ALANI
                    t.Cell().ColumnSpan(3).Border(0.75f).BorderColor(Colors.Black).Padding(4).Column(col =>
                    {
                        col.Spacing(1.5f);
                        col.Item().Text("Yukarıda kimliği verilen bölümümüz öğrencisinin belirtilen iş günü kadar staj yapması zorunludur.").FontSize(8f);
                        col.Item().Text("• 5510 sayılı kanunun 5/b ve 87/e fıkrası gereğince; Sosyal Güvenlik Kurumuna İş Kazası ve Meslek Hastalığı için sigortalı girişi ve primi Üniversitemiz tarafından yatırılacaktır.").FontSize(8f);
                    });

                    t.Cell().ColumnSpan(3).Border(0.75f).BorderColor(Colors.Black).Table(appTbl =>
                    {
                        appTbl.ColumnsDefinition(ac =>
                        {
                            ac.RelativeColumn();
                            ac.RelativeColumn();
                        });

                        appTbl.Cell().BorderRight(0.5f).BorderBottom(0.5f).BorderColor(Colors.Black)
                            .Background(Colors.Grey.Lighten4).Padding(3).AlignCenter()
                            .Text("S. Ü. BİLGİSAYAR MÜHENDİSLİĞİ ONAYI").Bold().FontSize(8.5f);

                        appTbl.Cell().BorderBottom(0.5f).BorderColor(Colors.Black)
                            .Background(Colors.Grey.Lighten4).Padding(3).AlignCenter()
                            .Text("S. Ü. TEKNOLOJİ FAKÜLTESİ ONAYI").Bold().FontSize(8.5f);

                        appTbl.Cell().BorderRight(0.5f).BorderColor(Colors.Black).Padding(6).Column(c =>
                        {
                            c.Item().Text(i.ApprovedAt.HasValue
                                ? $"Tarih: {i.ApprovedAt.Value:dd / MM / yyyy}"
                                : "Tarih: ….. / ….. / 202..").FontSize(8f);
                            c.Item().PaddingTop(14).AlignCenter().Text("Staj Komisyon Başkanı").Bold().FontSize(8.5f);
                        });

                        appTbl.Cell().Padding(6).Column(c =>
                        {
                            c.Item().Text("Tarih: ….. / ….. / 202..").FontSize(8f);
                            c.Item().PaddingTop(14).AlignCenter().Text("Dekan").Bold().FontSize(8.5f);
                        });
                    });

                    // 5. İŞYERİNİN BİLGİLERİ
                    SectionBanner(t, "İŞYERİNİN");

                    FormRow3Col(t, "Adı", $":   {i.Company?.Name ?? "-"}");
                    FormRow3Col(t, "Yetkilisi", $":   {i.AdvisorName}");
                    FormRow3Col(t, "Adresi", $":   {(string.IsNullOrWhiteSpace(companyAddress) ? "-" : companyAddress)}");
                    FormRow3Col(t, "Web Adresi", ":   -");
                    FormRow3Col(t, "Tel Numarası / e-posta", $":   {(string.IsNullOrWhiteSpace(companyContact) ? "-" : companyContact)}");
                    FormRow3Col(t, "İş Yeri Faaliyet Alanları", $":   {i.Company?.Sector ?? "-"}");

                    // 6. ÖĞRENCİDEN SORUMLU PERSONELİN BİLGİLERİ
                    SectionBanner(t, "ÖĞRENCİDEN SORUMLU PERSONELİN");

                    FormRow3Col(t, "Adı Soyadı", $":   {i.AdvisorName}");
                    FormRow3Col(t, "Mezun Olduğu Fakülte ve Bölüm Bilgileri", $":   {advisorGradDept}");
                    FormRow3Col(t, "Görevi", $":   {advisorRoleText}");

                    // 7. İŞVEREN VEYA YETKİLİSİNİN ONAYI
                    t.Cell().ColumnSpan(3).Border(0.75f).BorderColor(Colors.Black).Padding(6).Column(col =>
                    {
                        col.Item().Text(
                            "Yukarıda adı soyadı ve T.C. kimlik numarası yazılı öğrencinin yukarıda belirtilen tarihlerde iş yerimizde staj yapması uygun görülmüştür.")
                            .FontSize(8f);

                        col.Item().PaddingTop(4).Row(r =>
                        {
                            r.RelativeItem().Text("");
                            r.ConstantItem(210).Column(ic =>
                            {
                                ic.Item().AlignCenter().Text("İŞVEREN veya YETKİLİSİNİN").Bold().FontSize(8.5f);
                                ic.Item().AlignCenter().Text($"(Unvanı) Adı Soyadı: {advisorSignName}").FontSize(8f);
                                ic.Item().PaddingTop(14).AlignCenter().Text("Mühür ve İmza").Bold().FontSize(8f).FontColor(Colors.Grey.Darken2);
                            });
                        });
                    });
                });

                // =============================================================
                //  ALT BİLGİ NOTU + QR KOD DOĞRULAMA
                // =============================================================
                var qrBytes = GenerateQrPng(i.VerificationCode.ToString());
                page.Footer().PaddingTop(4).Row(r =>
                {
                    r.RelativeItem().AlignMiddle().Column(fc =>
                    {
                        fc.Item().Text(
                            "Not : 1- Bu evrak öğrenci tarafından 2 asıl nüsha düzenlenerek ve onayları tamamlanarak bölüm sekreterliğine teslim edilecektir.")
                            .FontSize(7.5f).Italic();
                        fc.Item().PaddingTop(2).Text($"Doğrulama Kodu: {i.VerificationCode}")
                            .FontSize(7f).Bold().FontColor(Colors.Grey.Darken2);
                    });
                    r.ConstantItem(44).Height(44).AlignRight().AlignMiddle().Image(qrBytes).FitArea();
                });
            });
        });

        return doc.GeneratePdf();
    }

    /// <inheritdoc />
    public byte[] GenerateLogbook(Internship i)
    {
        var entries = i.LogbookEntries.OrderBy(e => e.DayNumber).ThenBy(e => e.Date).ToList();

        var doc = QuestPDF.Fluent.Document.Create(container =>
        {
            // 1. Sayfa: Resmi Staj Raporu Kapağı (rapor__kapak.docx Sayfa 1)
            RenderReportCoverPage(container, i);

            // 2. Sayfa: İşyeri ve Personel Tanıtım Sayfası (rapor__kapak.docx Sayfa 2 - TF-BM-SF-02a)
            RenderCompanyIntroPage(container, i);

            // 3..N Sayfalar: Günlük Staj Raporu Sayfaları (rapor_sayfası.docx)
            if (entries.Count == 0)
            {
                RenderReportPage(container, i, 1, i.StartDate, "", "Henüz staj raporu sayfası girilmemiştir.");
            }
            else
            {
                for (int idx = 0; idx < entries.Count; idx++)
                {
                    var e = entries[idx];
                    RenderReportPage(container, i, e.DayNumber > 0 ? e.DayNumber : idx + 1, e.Date, e.Title, e.Content);
                }
            }
        });

        return doc.GeneratePdf();
    }

    /// <inheritdoc />
    public byte[] GenerateForm3(Internship i)
    {
        var isStaj1 = i.Type == InternshipType.Staj1;
        var isStaj2 = i.Type == InternshipType.Staj2;

        var doc = QuestPDF.Fluent.Document.Create(container =>
        {
            container.Page(page =>
            {
                page.Size(PageSizes.A4);
                page.MarginVertical(24);
                page.MarginHorizontal(30);
                page.DefaultTextStyle(x => x.FontSize(9f).FontColor(Colors.Black));

                page.Header().Table(t =>
                {
                    t.ColumnsDefinition(c =>
                    {
                        c.ConstantColumn(85);
                        c.RelativeColumn();
                        c.ConstantColumn(145);
                    });

                    t.Cell().Border(0.75f).BorderColor(Colors.Black).Padding(4).AlignCenter().AlignMiddle().Element(cell =>
                    {
                        if (UniversityLogoBytes is { Length: > 0 })
                            cell.Height(50).Image(UniversityLogoBytes).FitArea();
                        else
                            cell.Text("SELÇUK ÜNİVERSİTESİ").Bold().FontSize(8);
                    });

                    t.Cell().Border(0.75f).BorderColor(Colors.Black).Padding(4).AlignCenter().AlignMiddle().Column(col =>
                    {
                        col.Item().AlignCenter().Text("T.C.").Bold().FontSize(10);
                        col.Item().AlignCenter().Text("SELÇUK ÜNİVERSİTESİ").Bold().FontSize(10);
                        col.Item().AlignCenter().Text("TEKNOLOJİ FAKÜLTESİ").Bold().FontSize(10);
                        col.Item().AlignCenter().Text("BİLGİSAYAR MÜHENDİSLİĞİ BÖLÜMÜ").Bold().FontSize(9.5f);
                    });

                    t.Cell().Border(0.75f).BorderColor(Colors.Black).Table(meta =>
                    {
                        meta.ColumnsDefinition(mc =>
                        {
                            mc.ConstantColumn(68);
                            mc.RelativeColumn();
                        });
                        meta.Cell().ColumnSpan(2).BorderBottom(0.5f).BorderColor(Colors.Black)
                            .PaddingVertical(2).AlignCenter().Text("FORM-3").Bold().FontSize(9.5f);
                        MetaRow(meta, "Doküman No", "TF-BM-SF-03");
                        MetaRow(meta, "Revizyon Tarihi", "21.03.2022");
                        MetaRow(meta, "Revizyon No", "07");
                        MetaRow(meta, "Sayfa No", "1 / 1", isLast: true);
                    });
                });

                page.Content().PaddingTop(10).Column(col =>
                {
                    col.Spacing(6);
                    col.Item().AlignCenter().Text("STAJ DEVAM FORMU").Bold().FontSize(11f);
                    col.Item().AlignCenter().Text("(İşyeri tarafından doldurulacaktır)").Italic().FontSize(8.5f);
                    col.Item().Text("Sayın Yetkili, Öğrencinin staja devam etmesi zorunludur. Öğrenci, sizin tarafınızdan saklanacak bu forma, staj boyunca her iş günü imzalaması gerekmektedir.").FontSize(8.5f);

                    col.Item().Table(info =>
                    {
                        info.ColumnsDefinition(c =>
                        {
                            c.ConstantColumn(165);
                            c.RelativeColumn();
                        });
                        Form7CellLabel(info, "Öğrencinin Numarası");
                        Form7CellValue(info, i.Student?.StudentNo ?? "-");
                        Form7CellLabel(info, "Öğrencinin Adı Soyadı");
                        Form7CellValue(info, i.Student?.FullName ?? "-");
                        Form7CellLabel(info, "Staja Başlama ve Bitiş Tarihi");
                        Form7CellValue(info, $"{i.StartDate:dd.MM.yyyy} - {i.EndDate:dd.MM.yyyy} ({i.WorkDays} İş Günü / Cumartesi: {(i.WorksOnSaturday ? "Dahil" : "Hariç")})");
                        Form7CellLabel(info, "Staj Yapılan İşyeri");
                        Form7CellValue(info, $"{i.Company?.Name ?? "-"}   |   [ {(isStaj1 ? "X" : " ")} ] Staj 1     [ {(isStaj2 ? "X" : " ")} ] Staj 2");
                    });

                    col.Item().PaddingTop(4).Table(grid =>
                    {
                        grid.ColumnsDefinition(c =>
                        {
                            c.ConstantColumn(42);
                            c.RelativeColumn();
                            c.RelativeColumn();
                            c.RelativeColumn();
                            c.RelativeColumn();
                            c.RelativeColumn();
                            c.RelativeColumn();
                            c.ConstantColumn(75);
                        });

                        string[] headers = { "HAFTA", "Pazartesi", "Salı", "Çarşamba", "Perşembe", "Cuma", "Cumartesi", "Haftalık Toplam" };
                        foreach (var h in headers)
                        {
                            grid.Cell().Border(0.75f).BorderColor(Colors.Black).Background(Colors.Grey.Lighten3)
                                .Padding(4).AlignCenter().AlignMiddle().Text(h).Bold().FontSize(7.5f);
                        }

                        for (int w = 1; w <= 6; w++)
                        {
                            grid.Cell().Border(0.75f).BorderColor(Colors.Black).Padding(6).AlignCenter().AlignMiddle().Text(w.ToString()).Bold();
                            for (int d = 0; d < 6; d++)
                            {
                                grid.Cell().Border(0.75f).BorderColor(Colors.Black).Padding(6).AlignCenter().AlignMiddle().Text("…./….").FontSize(8f).FontColor(Colors.Grey.Darken1);
                            }
                            grid.Cell().Border(0.75f).BorderColor(Colors.Black).Padding(6).AlignCenter().AlignMiddle().Text("");
                        }
                    });

                    col.Item().PaddingTop(6).Text($"Staj süresi sonunda toplam çalışılan gün sayısı: {i.WorkDays} İş Günü").Bold().FontSize(9f);
                    col.Item().PaddingTop(6).Border(0.75f).BorderColor(Colors.Black).Padding(8).Column(sc =>
                    {
                        sc.Spacing(4);
                        sc.Item().Text("Staj Yapılan İşyerinde Öğrenciye Danışmanlık Veren Yetkilinin:").Bold().FontSize(9f);
                        sc.Item().Text($"Adı Soyadı: {i.AdvisorName} ({i.AdvisorEmail})").FontSize(9f);
                        sc.Item().PaddingTop(14).Text("İmza ve Kaşe: ................................................................................").FontSize(9f);
                    });
                    col.Item().Text("**Stajı bırakan veya rapor alan öğrenci aynı gün durumunu staj komisyonuna bildirmekle yükümlüdür.").Italic().FontSize(7.5f);
                });
            });
        });

        return doc.GeneratePdf();
    }

    /// <inheritdoc />
    public byte[] GenerateForm4(Internship i)
    {
        var isStaj1 = i.Type == InternshipType.Staj1;
        var isStaj2 = i.Type == InternshipType.Staj2;

        var doc = QuestPDF.Fluent.Document.Create(container =>
        {
            container.Page(page =>
            {
                page.Size(PageSizes.A4);
                page.MarginVertical(22);
                page.MarginHorizontal(28);
                page.DefaultTextStyle(x => x.FontSize(8.5f).FontColor(Colors.Black));

                page.Header().Table(t =>
                {
                    t.ColumnsDefinition(c =>
                    {
                        c.ConstantColumn(85);
                        c.RelativeColumn();
                        c.ConstantColumn(145);
                    });

                    t.Cell().Border(0.75f).BorderColor(Colors.Black).Padding(4).AlignCenter().AlignMiddle().Element(cell =>
                    {
                        if (UniversityLogoBytes is { Length: > 0 })
                            cell.Height(50).Image(UniversityLogoBytes).FitArea();
                        else
                            cell.Text("SELÇUK ÜNİVERSİTESİ").Bold().FontSize(8);
                    });

                    t.Cell().Border(0.75f).BorderColor(Colors.Black).Padding(4).AlignCenter().AlignMiddle().Column(col =>
                    {
                        col.Item().AlignCenter().Text("T.C.").Bold().FontSize(10);
                        col.Item().AlignCenter().Text("SELÇUK ÜNİVERSİTESİ").Bold().FontSize(10);
                        col.Item().AlignCenter().Text("TEKNOLOJİ FAKÜLTESİ").Bold().FontSize(10);
                        col.Item().AlignCenter().Text("BİLGİSAYAR MÜHENDİSLİĞİ BÖLÜMÜ").Bold().FontSize(9.5f);
                    });

                    t.Cell().Border(0.75f).BorderColor(Colors.Black).Table(meta =>
                    {
                        meta.ColumnsDefinition(mc =>
                        {
                            mc.ConstantColumn(68);
                            mc.RelativeColumn();
                        });
                        meta.Cell().ColumnSpan(2).BorderBottom(0.5f).BorderColor(Colors.Black)
                            .PaddingVertical(2).AlignCenter().Text("FORM-4").Bold().FontSize(9.5f);
                        MetaRow(meta, "Doküman No", "TF-BM-SF-04");
                        MetaRow(meta, "Revizyon Tarihi", "21.03.2022");
                        MetaRow(meta, "Revizyon No", "05");
                        MetaRow(meta, "Sayfa No", "1 / 1", isLast: true);
                    });
                });

                page.Content().PaddingTop(8).Column(col =>
                {
                    col.Spacing(6);
                    col.Item().AlignCenter().Text("STAJ DEĞERLENDİRME FORMU (İşyeri tarafından doldurulacaktır)").Bold().FontSize(10.5f);

                    col.Item().Table(info =>
                    {
                        info.ColumnsDefinition(c =>
                        {
                            c.ConstantColumn(145);
                            c.RelativeColumn();
                            c.ConstantColumn(110);
                            c.RelativeColumn();
                        });

                        Form7CellLabel(info, "Öğrenci Numarası");
                        Form7CellValue(info, i.Student?.StudentNo ?? "-");
                        Form7CellLabel(info, "Adı, Soyadı");
                        Form7CellValue(info, i.Student?.FullName ?? "-");

                        Form7CellLabel(info, "Bölümü");
                        Form7CellValue(info, i.Student?.Department ?? "Bilgisayar Mühendisliği");
                        Form7CellLabel(info, "Staj Süresi / Türü");
                        Form7CellValue(info, $"{i.WorkDays} İş Günü — {(isStaj1 ? "Staj I" : isStaj2 ? "Staj II" : "-")}");

                        Form7CellLabel(info, "Staj Tarihleri");
                        Form7CellValue(info, $"{i.StartDate:dd.MM.yyyy} - {i.EndDate:dd.MM.yyyy}");
                        Form7CellLabel(info, "Çalıştığı Birim");
                        Form7CellValue(info, i.Department ?? "-");

                        Form7CellLabel(info, "Değerlendiren İşyeri");
                        Form7CellValue(info, i.Company?.Name ?? "-");
                        Form7CellLabel(info, "Danışman (Yetkili)");
                        Form7CellValue(info, $"{i.AdvisorName} ({i.AdvisorEmail})");
                    });

                    col.Item().Text("I. Öğrencinin işyerinizdeki performansını değerlendiriniz:").Bold().FontSize(9f);

                    col.Item().Table(crit =>
                    {
                        crit.ColumnsDefinition(c =>
                        {
                            c.RelativeColumn(3);
                            c.RelativeColumn();
                            c.RelativeColumn();
                            c.RelativeColumn();
                            c.RelativeColumn();
                            c.RelativeColumn();
                        });

                        string[] cols = { "DEĞERLENDİRME KRİTERLERİ", "ÇOK İYİ", "İYİ", "ORTA", "YETERSİZ", "ÇOK YETERSİZ" };
                        foreach (var h in cols)
                        {
                            crit.Cell().Border(0.75f).BorderColor(Colors.Black).Background(Colors.Grey.Lighten3)
                                .Padding(4).AlignCenter().AlignMiddle().Text(h).Bold().FontSize(7.5f);
                        }

                        string[] rows =
                        {
                            "Alan bilgisi ve motivasyonu",
                            "Bilgilerini uygulama becerisi",
                            "İşi zamanında ve tam yapması",
                            "Yeni teknolojilere (bilgilere) uyum sağlama becerisi",
                            "Yapılan işi anlatabilme becerisi",
                            "Kurum personeli ile uyumu",
                            "Kurum kurallarına uygun davranışı"
                        };

                        foreach (var r in rows)
                        {
                            crit.Cell().Border(0.75f).BorderColor(Colors.Black).Padding(4).Text(r).FontSize(8f);
                            for (int k = 0; k < 5; k++)
                                crit.Cell().Border(0.75f).BorderColor(Colors.Black).Padding(4).AlignCenter().Text("[   ]").FontSize(8f);
                        }
                    });

                    col.Item().PaddingTop(4).Border(0.75f).BorderColor(Colors.Black).Padding(8).Row(r =>
                    {
                        r.RelativeItem().Column(c =>
                        {
                            c.Item().Text("II. Öğrencinin işyerinizdeki genel performansını değerlendiriniz:").Bold().FontSize(9f);
                            c.Item().PaddingTop(6).Text("[   ] Başarılı                    [   ] Başarısız").Bold().FontSize(9.5f);
                        });
                        r.ConstantItem(180).Column(c =>
                        {
                            c.Item().Text($"Tarih: {DateTime.Now:dd.MM.yyyy}").FontSize(8.5f);
                            c.Item().PaddingTop(4).Text($"Yetkili: {i.AdvisorName}").Bold().FontSize(8.5f);
                            c.Item().PaddingTop(14).Text("Kaşe ve İmza: ..............................").FontSize(8.5f);
                        });
                    });
                });
            });
        });

        return doc.GeneratePdf();
    }

    /// <inheritdoc />
    public byte[] GenerateForm7(Internship i, string reason, string educationType, DateOnly formDate)
    {
        var isStaj1 = i.Type == InternshipType.Staj1;
        var isStaj2 = i.Type == InternshipType.Staj2;
        var eduType = string.IsNullOrWhiteSpace(educationType) ? "NÖ" : educationType.Trim();
        var cleanReason = string.IsNullOrWhiteSpace(reason) ? "-" : reason.Trim();

        var doc = QuestPDF.Fluent.Document.Create(container =>
        {
            container.Page(page =>
            {
                page.Size(PageSizes.A4);
                page.MarginVertical(28);
                page.MarginHorizontal(34);
                page.DefaultTextStyle(x => x.FontSize(9.5f).FontColor(Colors.Black));

                // =============================================================
                //  ÜST BAŞLIK TABLOSU (form7_staj_iptal.docx Header - FORM-7)
                // =============================================================
                page.Header().Table(t =>
                {
                    t.ColumnsDefinition(c =>
                    {
                        c.ConstantColumn(90);
                        c.RelativeColumn();
                        c.ConstantColumn(150);
                    });

                    // Sol Hücre: Üniversite Amblemi
                    t.Cell().Border(0.75f).BorderColor(Colors.Black).Padding(6).AlignCenter().AlignMiddle().Element(cell =>
                    {
                        if (UniversityLogoBytes is { Length: > 0 })
                        {
                            cell.Height(56).Image(UniversityLogoBytes).FitArea();
                        }
                        else
                        {
                            cell.Column(col =>
                            {
                                col.Item().AlignCenter().Text("T.C.").Bold().FontSize(8.5f);
                                col.Item().AlignCenter().Text("SELÇUK ÜNİVERSİTESİ").Bold().FontSize(8f);
                                col.Item().AlignCenter().Text("TEKNOLOJİ FAKÜLTESİ").FontSize(7.5f);
                            });
                        }
                    });

                    // Orta Hücre: Kurum Başlığı
                    t.Cell().Border(0.75f).BorderColor(Colors.Black).Padding(6).AlignCenter().AlignMiddle().Column(col =>
                    {
                        col.Spacing(1.5f);
                        col.Item().AlignCenter().Text("T.C.").Bold().FontSize(10.5f);
                        col.Item().AlignCenter().Text("SELÇUK ÜNİVERSİTESİ").Bold().FontSize(10.5f);
                        col.Item().AlignCenter().Text("TEKNOLOJİ FAKÜLTESİ").Bold().FontSize(10.5f);
                        col.Item().AlignCenter().Text("BİLGİSAYAR MÜHENDİSLİĞİ BÖLÜMÜ").Bold().FontSize(10f);
                    });

                    // Sağ Hücre: FORM-7 Doküman Bilgileri Tablosu
                    t.Cell().Border(0.75f).BorderColor(Colors.Black).Table(meta =>
                    {
                        meta.ColumnsDefinition(mc =>
                        {
                            mc.ConstantColumn(72);
                            mc.RelativeColumn();
                        });

                        meta.Cell().ColumnSpan(2).BorderBottom(0.5f).BorderColor(Colors.Black)
                            .PaddingVertical(2.5f).AlignCenter().Text("FORM-7").Bold().FontSize(10f);

                        MetaRow(meta, "Doküman No", "TF-BM-SF-07");
                        MetaRow(meta, "Revizyon Tarihi", "21.03.2022");
                        MetaRow(meta, "Revizyon No", "02");
                        MetaRow(meta, "Sayfa No", "1 / 1", isLast: true);
                    });
                });

                // =============================================================
                //  ANA GÖVDE TABLOSU (form7_staj_iptal.docx Body)
                // =============================================================
                page.Content().PaddingTop(18).Column(col =>
                {
                    col.Spacing(10);

                    col.Item().AlignCenter().Text("STAJ İPTAL FORMU").Bold().FontSize(12f);

                    col.Item().Table(t =>
                    {
                        t.ColumnsDefinition(c =>
                        {
                            c.ConstantColumn(110);
                            c.RelativeColumn();
                            c.ConstantColumn(95);
                            c.RelativeColumn();
                        });

                        // Row 1: Konu : Staj İptali | Tarih: ...
                        t.Cell().ColumnSpan(2).Border(0.75f).BorderColor(Colors.Black)
                            .PaddingVertical(6).PaddingHorizontal(8)
                            .Text("Konu : Staj İptali").Bold().FontSize(9.5f);

                        t.Cell().ColumnSpan(2).Border(0.75f).BorderColor(Colors.Black)
                            .PaddingVertical(6).PaddingHorizontal(8)
                            .Text($"Tarih: {formDate:dd.MM.yyyy}").Bold().FontSize(9.5f);

                        // Row 2: Adı Soyadı | ... | T.C. Kimlik No | ...
                        Form7CellLabel(t, "Adı Soyadı");
                        Form7CellValue(t, i.Student?.FullName ?? "-");
                        Form7CellLabel(t, "T.C. Kimlik No");
                        Form7CellValue(t, i.Student?.NationalId ?? "-");

                        // Row 3: Öğrenci No | ... | Cep Tel No | ...
                        Form7CellLabel(t, "Öğrenci No");
                        Form7CellValue(t, i.Student?.StudentNo ?? "-");
                        Form7CellLabel(t, "Cep Tel No");
                        Form7CellValue(t, i.Student?.Phone ?? "-");

                        // Row 4: NÖ / İÖ | ... | E-posta | ...
                        Form7CellLabel(t, "NÖ / İÖ");
                        Form7CellValue(t, eduType);
                        Form7CellLabel(t, "E-posta");
                        Form7CellValue(t, i.Student?.Email ?? "-");

                        // Row 5: Staj Yapılan İşyeri Adı | ... (colSpan 3)
                        Form7CellLabel(t, "Staj Yapılan İşyeri Adı");
                        t.Cell().ColumnSpan(3).Border(0.75f).BorderColor(Colors.Black)
                            .PaddingVertical(6).PaddingHorizontal(8).AlignMiddle()
                            .Text(i.Company?.Name ?? "-").FontSize(9.5f);

                        // Row 6: Staj Türü* | ☐ Staj-1   ☐ Staj-2 (colSpan 3)
                        Form7CellLabel(t, "Staj Türü*");
                        t.Cell().ColumnSpan(3).Border(0.75f).BorderColor(Colors.Black)
                            .PaddingVertical(6).PaddingHorizontal(8).AlignMiddle()
                            .Text($"[ {(isStaj1 ? "X" : " ")} ] Staj-1                    [ {(isStaj2 ? "X" : " ")} ] Staj-2")
                            .Bold().FontSize(9.5f);

                        // Row 7: Dilekçe Metni, Mazeret ve İmza Kutusu (colSpan 4)
                        t.Cell().ColumnSpan(4).Border(0.75f).BorderColor(Colors.Black).Padding(12).Column(bodyCol =>
                        {
                            bodyCol.Spacing(10);

                            bodyCol.Item().Text(
                                $"Başlangıç tarihi {i.StartDate:dd/MM/yyyy} , bitiş tarihi {i.EndDate:dd/MM/yyyy} olan {i.WorkDays} iş günlük stajımı aşağıda belirttiğim mazeretten dolayı sonlandırmak için gereğini saygılarımla arz ederim.")
                                .FontSize(10f).LineHeight(1.35f);

                            bodyCol.Item().PaddingTop(4).Column(mCol =>
                            {
                                mCol.Spacing(4);
                                mCol.Item().Text("Mazeretim:").Bold().FontSize(10f);
                                mCol.Item().MinHeight(120).Border(0.5f).BorderColor(Colors.Grey.Lighten1)
                                    .Background(Colors.Grey.Lighten5).Padding(8)
                                    .Text(cleanReason).FontSize(10f).LineHeight(1.35f);
                            });

                            bodyCol.Item().PaddingTop(16).Row(r =>
                            {
                                r.RelativeItem().Text("");
                                r.ConstantItem(180).Column(sigCol =>
                                {
                                    sigCol.Item().AlignCenter().Text("İmza").Bold().FontSize(10f);
                                    sigCol.Item().PaddingTop(4).AlignCenter().Text(i.Student?.FullName ?? "").FontSize(9.5f);
                                    sigCol.Item().PaddingTop(18).AlignCenter().Text(".................................").FontSize(8.5f).FontColor(Colors.Grey.Darken1);
                                });
                            });
                        });
                    });

                    col.Item().PaddingTop(2).Text("*Her staj için ayrı Staj İptal Formu doldurulmalıdır.")
                        .FontSize(8.5f).Italic();
                });
            });
        });

        return doc.GeneratePdf();
    }

    private static void RenderReportCoverPage(IDocumentContainer container, Internship i)
    {
        var isStaj1 = i.Type == InternshipType.Staj1;
        container.Page(page =>
        {
            page.Size(PageSizes.A4);
            page.Margin(45);
            page.DefaultTextStyle(x => x.FontSize(12f).FontColor(Colors.Black));

            page.Content().Border(1.5f).BorderColor(Colors.Black).Padding(30).Column(col =>
            {
                col.Item().AlignCenter().Text("T.C.").Bold().FontSize(16);
                col.Item().PaddingTop(4).AlignCenter().Text("SELÇUK ÜNİVERSİTESİ").Bold().FontSize(16);
                col.Item().PaddingTop(4).AlignCenter().Text("TEKNOLOJİ FAKÜLTESİ").Bold().FontSize(15);
                col.Item().PaddingTop(4).AlignCenter().Text("BİLGİSAYAR MÜHENDİSLİĞİ BÖLÜMÜ").Bold().FontSize(14);

                col.Item().PaddingVertical(35).AlignCenter().Element(el =>
                {
                    if (UniversityLogoBytes is { Length: > 0 })
                        el.Height(120).Image(UniversityLogoBytes).FitArea();
                    else
                        el.Text("SELÇUK ÜNİVERSİTESİ AMBLEMİ").Bold();
                });

                col.Item().PaddingTop(10).AlignCenter().Text($"Öğrenci Numarası: {i.Student?.StudentNo ?? "-"}").Bold().FontSize(13);
                col.Item().PaddingTop(6).AlignCenter().Text($"Adı ve Soyadı: {i.Student?.FullName ?? "-"}").Bold().FontSize(13);

                col.Item().PaddingVertical(35).AlignCenter().Column(c =>
                {
                    c.Item().AlignCenter().Text(isStaj1 ? "STAJ I RAPORU" : "STAJ II RAPORU").Bold().FontSize(20);
                    c.Item().PaddingTop(8).AlignCenter().Text($"{i.Company?.Name ?? "-"}").Bold().FontSize(12).FontColor(Colors.Grey.Darken3);
                    c.Item().PaddingTop(4).AlignCenter().Text($"({i.StartDate:dd.MM.yyyy} - {i.EndDate:dd.MM.yyyy} • {i.WorkDays} İş Günü)").FontSize(10.5f).FontColor(Colors.Grey.Darken2);
                });

                var coverQrBytes = GenerateQrPng(i.VerificationCode.ToString());
                col.Item().ExtendVertical().AlignBottom().Column(b =>
                {
                    b.Item().AlignCenter().Text(i.StartDate.Year.ToString()).Bold().FontSize(14);
                    b.Item().PaddingTop(2).AlignCenter().Text("KONYA").Bold().FontSize(14);
                    b.Item().PaddingTop(10).AlignCenter().Width(52).Height(52).Image(coverQrBytes).FitArea();
                    b.Item().PaddingTop(2).AlignCenter().Text($"Doğrulama Kodu: {i.VerificationCode}")
                        .FontSize(7.5f).FontColor(Colors.Grey.Darken2);
                });
            });
        });
    }

    private static void RenderCompanyIntroPage(IDocumentContainer container, Internship i)
    {
        var companyAddress = string.Join(" / ",
            new[] { i.Company?.Address, i.Company?.City }.Where(s => !string.IsNullOrWhiteSpace(s)));

        container.Page(page =>
        {
            page.Size(PageSizes.A4);
            page.MarginVertical(28);
            page.MarginHorizontal(34);
            page.DefaultTextStyle(x => x.FontSize(9.5f).FontColor(Colors.Black));

            // ÜST BAŞLIK TABLOSU (rapor__kapak.docx Sayfa 2 - TF-BM-SF-02a)
            page.Header().Table(t =>
            {
                t.ColumnsDefinition(c =>
                {
                    c.ConstantColumn(90);
                    c.RelativeColumn();
                    c.ConstantColumn(145);
                });

                t.Cell().Border(0.75f).BorderColor(Colors.Black).Padding(4).AlignCenter().AlignMiddle().Element(cell =>
                {
                    if (UniversityLogoBytes is { Length: > 0 })
                        cell.Height(50).Image(UniversityLogoBytes).FitArea();
                    else
                        cell.Text("SELÇUK ÜNİVERSİTESİ").Bold().FontSize(8);
                });

                t.Cell().Border(0.75f).BorderColor(Colors.Black).Padding(4).AlignCenter().AlignMiddle().Column(col =>
                {
                    col.Item().AlignCenter().Text("T.C.").Bold().FontSize(10.5f);
                    col.Item().AlignCenter().Text("SELÇUK ÜNİVERSİTESİ").Bold().FontSize(10.5f);
                    col.Item().AlignCenter().Text("TEKNOLOJİ FAKÜLTESİ").Bold().FontSize(10.5f);
                    col.Item().AlignCenter().Text("BİLGİSAYAR MÜHENDİSLİĞİ BÖLÜMÜ").Bold().FontSize(10f);
                });

                t.Cell().Border(0.75f).BorderColor(Colors.Black).Table(meta =>
                {
                    meta.ColumnsDefinition(mc =>
                    {
                        mc.ConstantColumn(68);
                        mc.RelativeColumn();
                    });
                    MetaRow(meta, "Doküman No", "TF-BM-SF-02a");
                    MetaRow(meta, "Revizyon Tarihi", "16.02.2021");
                    MetaRow(meta, "Revizyon No", "04");
                    MetaRow(meta, "Sayfa No", "2 / 2", isLast: true);
                });
            });

            page.Content().PaddingTop(14).Column(col =>
            {
                col.Spacing(10);

                // İŞYERİ TANITIM TABLOSU
                col.Item().Table(t =>
                {
                    t.ColumnsDefinition(c =>
                    {
                        c.ConstantColumn(165);
                        c.RelativeColumn();
                    });

                    Form7CellLabel(t, "İŞYERİ ADI");
                    Form7CellValue(t, i.Company?.Name ?? "-");

                    Form7CellLabel(t, "İŞYERİ YETKİLİSİ");
                    Form7CellValue(t, i.AdvisorName);

                    Form7CellLabel(t, "ADRESİ");
                    Form7CellValue(t, string.IsNullOrWhiteSpace(companyAddress) ? "-" : companyAddress);

                    Form7CellLabel(t, "TELEFONU");
                    Form7CellValue(t, i.Company?.Phone ?? "-");

                    Form7CellLabel(t, "E-POSTA");
                    Form7CellValue(t, !string.IsNullOrWhiteSpace(i.Company?.Email) ? i.Company!.Email! : i.AdvisorEmail);

                    Form7CellLabel(t, "STAJ YAPILAN BİRİM");
                    Form7CellValue(t, i.Department ?? "Bilgisayar / Yazılım Mühendisliği Birimi");

                    Form7CellLabel(t, "İŞYERİ FAALİYET ALANLARI");
                    Form7CellValue(t, i.Company?.Sector ?? "Yazılım, Bilişim ve Mühendislik Uygulamaları");
                });

                // PERSONEL TANITIMI TABLOSU
                col.Item().PaddingTop(6).Table(pt =>
                {
                    pt.ColumnsDefinition(c =>
                    {
                        c.ConstantColumn(45);
                        c.RelativeColumn(2);
                        c.RelativeColumn(3);
                        c.RelativeColumn(2);
                    });

                    pt.Cell().ColumnSpan(4).Border(0.75f).BorderColor(Colors.Black).Background(Colors.Grey.Lighten3)
                        .Padding(5).AlignCenter().Text("PERSONEL TANITIMI").Bold().FontSize(10f);

                    string[] headers = { "SIRA NO", "ADI SOYADI", "MEZUN OLDUĞU ÜNİVERSİTE / FAKÜLTE / BÖLÜM", "GÖREVİ" };
                    foreach (var h in headers)
                    {
                        pt.Cell().Border(0.75f).BorderColor(Colors.Black).Background(Colors.Grey.Lighten4)
                            .Padding(4).AlignCenter().AlignMiddle().Text(h).Bold().FontSize(8f);
                    }

                    // 1. Satır: Sorumlu Mühendis / Danışman
                    pt.Cell().Border(0.75f).BorderColor(Colors.Black).Padding(5).AlignCenter().Text("1").FontSize(8.5f);
                    pt.Cell().Border(0.75f).BorderColor(Colors.Black).Padding(5).Text(i.AdvisorName).Bold().FontSize(8.5f);
                    pt.Cell().Border(0.75f).BorderColor(Colors.Black).Padding(5).Text(i.Department ?? "Mühendislik Fakültesi / Bilgisayar Mühendisliği").FontSize(8.5f);
                    pt.Cell().Border(0.75f).BorderColor(Colors.Black).Padding(5).Text("İşyeri Staj Sorumlusu / Mühendis").FontSize(8.5f);

                    for (int r = 2; r <= 8; r++)
                    {
                        pt.Cell().Border(0.75f).BorderColor(Colors.Black).Padding(5).AlignCenter().Text(r.ToString()).FontSize(8.5f);
                        pt.Cell().Border(0.75f).BorderColor(Colors.Black).Padding(5).Text("");
                        pt.Cell().Border(0.75f).BorderColor(Colors.Black).Padding(5).Text("");
                        pt.Cell().Border(0.75f).BorderColor(Colors.Black).Padding(5).Text("");
                    }
                });
            });
        });
    }

    private static void RenderReportPage(IDocumentContainer container, Internship i, int pageNo, DateOnly date, string title, string content)
    {
        container.Page(page =>
        {
            page.Size(PageSizes.A4);
            page.Margin(36);
            page.DefaultTextStyle(x => x.FontSize(10.5f));

            // ÜST TABLO (rapor_sayfası.docx Header Birebir Şablonu)
            page.Header().Table(t =>
            {
                t.ColumnsDefinition(c =>
                {
                    c.ConstantColumn(105);
                    c.RelativeColumn();
                    c.ConstantColumn(65);
                    c.ConstantColumn(85);
                });

                // Sol Hücre (2 satır birleşik): Kurum Amblemi
                t.Cell().RowSpan(2).Border(1).BorderColor(Colors.Black).Padding(6).AlignCenter().AlignMiddle().Column(col =>
                {
                    if (UniversityLogoBytes is { Length: > 0 })
                    {
                        col.Item().AlignCenter().Height(52).Image(UniversityLogoBytes).FitArea();
                    }
                    else
                    {
                        col.Item().AlignCenter().Text("SELÇUK ÜNİVERSİTESİ").Bold().FontSize(7.5f);
                        col.Item().AlignCenter().Text("TEKNOLOJİ FAKÜLTESİ").Bold().FontSize(7f);
                    }
                });

                // Orta Hücre (2 satır birleşik): Resmi Başlık
                t.Cell().RowSpan(2).Border(1).BorderColor(Colors.Black).Padding(6).AlignCenter().AlignMiddle().Column(col =>
                {
                    col.Item().AlignCenter().Text("T.C.").Bold().FontSize(11);
                    col.Item().AlignCenter().Text("SELÇUK ÜNİVERSİTESİ").Bold().FontSize(11);
                    col.Item().AlignCenter().Text("TEKNOLOJİ FAKÜLTESİ").Bold().FontSize(11);
                    col.Item().AlignCenter().Text("BİLGİSAYAR MÜHENDİSLİĞİ BÖLÜMÜ").Bold().FontSize(11);
                    col.Item().AlignCenter().Text("STAJ RAPORU").Bold().FontSize(11);
                });

                // Sağ Üst: Tarih
                t.Cell().Border(1).BorderColor(Colors.Black).Padding(6).AlignMiddle().Text("Tarih").FontSize(10);
                t.Cell().Border(1).BorderColor(Colors.Black).Padding(6).AlignCenter().AlignMiddle().Text(date.ToString("dd.MM.yyyy")).Bold().FontSize(10);

                // Sağ Alt: Sayfa No
                t.Cell().Border(1).BorderColor(Colors.Black).Padding(6).AlignMiddle().Text("Sayfa No:").FontSize(10);
                t.Cell().Border(1).BorderColor(Colors.Black).Padding(6).AlignCenter().AlignMiddle().Text(pageNo.ToString()).Bold().FontSize(10);
            });

            // ORTA GÖVDE (Rapor Metni Alanı)
            page.Content().PaddingVertical(14).Border(0.5f).BorderColor(Colors.Grey.Lighten1).Padding(14).Column(col =>
            {
                col.Spacing(8);
                col.Item().Row(r =>
                {
                    r.RelativeItem().Text($"Öğrenci: {i.Student?.FullName} ({i.Student?.StudentNo})").FontSize(9).FontColor(Colors.Grey.Darken2);
                    r.RelativeItem().AlignRight().Text($"Kurum: {i.Company?.Name}").FontSize(9).FontColor(Colors.Grey.Darken2);
                });
                if (!string.IsNullOrWhiteSpace(title))
                {
                    col.Item().BorderBottom(0.5f).BorderColor(Colors.Grey.Lighten2).PaddingBottom(4)
                        .Text($"Konu / Yapılan İş: {title}").Bold().FontSize(10.5f);
                }
                col.Item().PaddingTop(4).Text(content).FontSize(10.5f).LineHeight(1.35f);
            });

            // ALT TABLO (rapor_sayfası.docx Footer Birebir Şablonu)
            page.Footer().Table(t =>
            {
                t.ColumnsDefinition(c => c.RelativeColumn());

                t.Cell().Border(1).BorderColor(Colors.Black).PaddingVertical(4).AlignCenter()
                    .Text("STAJ SORUMLUSU").Bold().FontSize(10);

                t.Cell().Border(1).BorderColor(Colors.Black).Height(42).AlignCenter().AlignMiddle()
                    .Text(i.AdvisorLogbookApproved
                        ? $"ONAYLANDI — {i.AdvisorName} ({i.AdvisorApprovedAt:dd.MM.yyyy})"
                        : "Onay (İmza & Kaşe)")
                    .FontSize(10)
                    .FontColor(i.AdvisorLogbookApproved ? Colors.Green.Darken2 : Colors.Grey.Medium);

                t.Cell().Border(1).BorderColor(Colors.Black).PaddingVertical(4).AlignCenter()
                    .Text(i.AdvisorLogbookApproved
                        ? $"{date:dd} / {date:MM} / {date:yyyy}"
                        : "........ /   . / 20 ..")
                    .FontSize(10)
                    .FontColor(Colors.Grey.Darken1);
            });
        });
    }

    private static void MetaRow(TableDescriptor meta, string label, string value, bool isLast = false)
    {
        var borderBottom = isLast ? 0f : 0.5f;
        meta.Cell().BorderRight(0.5f).BorderBottom(borderBottom).BorderColor(Colors.Black)
            .PaddingVertical(1.5f).PaddingHorizontal(4).Text(label).FontSize(7.5f);
        meta.Cell().BorderBottom(borderBottom).BorderColor(Colors.Black)
            .PaddingVertical(1.5f).PaddingHorizontal(4).AlignCenter().Text(value).Bold().FontSize(7.5f);
    }

    private static void SectionBanner(TableDescriptor t, string title)
    {
        t.Cell().ColumnSpan(3).Border(0.75f).BorderColor(Colors.Black)
            .Background(Colors.Grey.Lighten4).PaddingVertical(2.5f).PaddingHorizontal(6)
            .Text(title).Bold().FontSize(8.5f);
    }

    private static void FormRow2Col(TableDescriptor t, string label, string value)
    {
        t.Cell().Border(0.75f).BorderColor(Colors.Black)
            .PaddingVertical(2.5f).PaddingHorizontal(6).Text(label).Bold().FontSize(8f);
        t.Cell().Border(0.75f).BorderColor(Colors.Black)
            .PaddingVertical(2.5f).PaddingHorizontal(6).Text($":   {value}").FontSize(8.5f);
    }

    private static void FormRow3Col(TableDescriptor t, string label, string value)
    {
        t.Cell().Border(0.75f).BorderColor(Colors.Black)
            .PaddingVertical(2.5f).PaddingHorizontal(6).Text(label).Bold().FontSize(8f);
        t.Cell().ColumnSpan(2).Border(0.75f).BorderColor(Colors.Black)
            .PaddingVertical(2.5f).PaddingHorizontal(6).Text(value).FontSize(8.5f);
    }

    private static void DeclarationOptionRow(TableDescriptor t, string text)
    {
        t.Cell().ColumnSpan(3).Border(0.75f).BorderColor(Colors.Black)
            .PaddingVertical(2.5f).PaddingHorizontal(6).Row(r =>
            {
                r.ConstantItem(22).AlignMiddle().Text("[   ]").Bold().FontSize(8.5f);
                r.RelativeItem().Text(text).FontSize(7.8f);
            });
    }

    private static void Form7CellLabel(TableDescriptor t, string label)
    {
        t.Cell().Border(0.75f).BorderColor(Colors.Black)
            .Background(Colors.Grey.Lighten4)
            .PaddingVertical(6).PaddingHorizontal(8).AlignMiddle()
            .Text(label).Bold().FontSize(9f);
    }

    private static void Form7CellValue(TableDescriptor t, string value)
    {
        t.Cell().Border(0.75f).BorderColor(Colors.Black)
            .PaddingVertical(6).PaddingHorizontal(8).AlignMiddle()
            .Text(value).FontSize(9.5f);
    }
}
