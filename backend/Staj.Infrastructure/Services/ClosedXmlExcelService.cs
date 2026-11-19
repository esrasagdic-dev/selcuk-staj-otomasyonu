using ClosedXML.Excel;
using Staj.Application.Common;
using Staj.Application.DTOs;
using Staj.Domain.Enums;

namespace Staj.Infrastructure.Services;

/// <summary>
/// KPTO (Sigorta Birimi) için SGK işe giriş bildirgesine uygun Excel (.xlsx) dökümü üretir.
/// </summary>
public class ClosedXmlExcelService : IExcelService
{
    /// <inheritdoc />
    public byte[] GenerateKptoList(IEnumerable<KptoRowDto> rows)
    {
        using var wb = new XLWorkbook();
        var ws = wb.Worksheets.Add("KPTO Staj Sigorta Listesi");

        var headers = new[]
        {
            "Sıra", "Öğrenci No", "Ad Soyad", "T.C. Kimlik No", "Telefon", "E-Posta",
            "Staj Türü", "Firma Adı", "Firma Adresi", "Başlama Tarihi", "Bitiş Tarihi",
            "İş Günü", "Maaş Alıyor mu?", "Sigorta Durumu", "Tarih Değişti mi (İzin)?", "KPTO Notu"
        };

        for (var c = 0; c < headers.Length; c++)
        {
            var cell = ws.Cell(1, c + 1);
            cell.Value = headers[c];
            cell.Style.Font.Bold = true;
            cell.Style.Fill.BackgroundColor = XLColor.FromHtml("#1E3A8A");
            cell.Style.Font.FontColor = XLColor.White;
        }

        var r = 2;
        foreach (var row in rows)
        {
            ws.Cell(r, 1).Value = r - 1;
            ws.Cell(r, 2).Value = row.StudentNo ?? "";
            ws.Cell(r, 3).Value = row.StudentName;
            ws.Cell(r, 4).Value = row.NationalId ?? "";
            ws.Cell(r, 5).Value = row.StudentPhone ?? "";
            ws.Cell(r, 6).Value = row.StudentEmail;
            ws.Cell(r, 7).Value = row.Type == InternshipType.Staj1 ? "Staj 1" : "Staj 2";
            ws.Cell(r, 8).Value = row.CompanyName;
            ws.Cell(r, 9).Value = row.CompanyAddress ?? "";
            ws.Cell(r, 10).Value = row.StartDate.ToString("dd.MM.yyyy");
            ws.Cell(r, 11).Value = row.EndDate.ToString("dd.MM.yyyy");
            ws.Cell(r, 12).Value = row.WorkDays;
            ws.Cell(r, 13).Value = row.ReceivesSalary ? "Evet" : "Hayır";
            ws.Cell(r, 14).Value = row.KptoStatus switch
            {
                KptoInsuranceStatus.Pending => "Gelenler (Bekliyor)",
                KptoInsuranceStatus.InsuranceActive => "Sigortası Başlatıldı",
                KptoInsuranceStatus.InsuranceNotStarted => "Sigortası Başlatılmadı",
                _ => "-"
            };
            ws.Cell(r, 15).Value = row.DateChanged ? "EVET (Güncellendi)" : "Hayır";
            ws.Cell(r, 16).Value = row.KptoNote ?? "";
            r++;
        }

        ws.Columns().AdjustToContents();
        using var ms = new MemoryStream();
        wb.SaveAs(ms);
        return ms.ToArray();
    }
}
