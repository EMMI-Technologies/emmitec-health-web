/* ============================================================
   Certificados dos aparelhos (/certificates): os mesmos 15 documentos
   da página antiga (gadgets-certificates.html), agrupados por órgão.
   Os PDFs continuam na cópia do site antigo (assets.emmitec.health/legado),
   o mesmo lugar para onde aponta a regra /assets/files/* do Amplify.
   Títulos e detalhes de cada documento: `certificatesPage.docs.<id>` no i18n.
   ============================================================ */
import anvisaLogo from '@/assets/certs/anvisa.png'
import fdaLogo from '@/assets/certs/fda.png'
import ceLogo from '@/assets/certs/ce.png'
import isoLogo from '@/assets/certs/iso.png'

const PDF_BASE = 'https://assets.emmitec.health/legado/assets/files/'

export interface CertificateDoc {
  /** chave em `certificatesPage.docs` */
  id: string
  /** nome do arquivo exatamente como está no servidor */
  file: string
}

export interface CertificateGroup {
  /** chave em `certificatesPage.groups` */
  id: string
  logo: string
  docs: CertificateDoc[]
}

export const certificateGroups: CertificateGroup[] = [
  {
    id: 'fda510k',
    logo: fdaLogo,
    docs: [
      { id: 'k151024', file: 'K151024-TD-8255- Letter.SE.FINAL_Sent001.pdf' },
      { id: 'k133588', file: 'K133588-TD-3140- P80 BPMS  (ForaCare).pdf' },
      {
        id: 'k161738',
        file: 'K161738 - FORA ADVANCED GD40 Blood Glucose and B-Ketone Monitoring System_TD-4272G.pdf',
      },
      { id: 'k113159', file: 'K113159-TD-1240 Thermometer (U-RIGHT).pdf' },
    ],
  },
  {
    id: 'fdaRegistro',
    logo: fdaLogo,
    docs: [
      { id: 'andPressao', file: 'Establishment Registration & Device Listing.pdf' },
      { id: 'andBalanca', file: 'AND Establishment Registration & Device Listing B.pdf' },
      { id: 'roche', file: 'Accu-Chech Roche Establishment Registration & Device Listing.pdf' },
    ],
  },
  {
    id: 'qualidade',
    logo: isoLogo,
    docs: [
      { id: 'iso13485', file: 'TaiDoc (13485 ) Q5 052126 0062 Rev. 05.pdf' },
      { id: 'iso9001', file: 'TaiDoc (9K15 7RA 20210803) 12 100 22751 TMS.pdf' },
      { id: 'mdsap', file: 'MDSAP.pdf' },
    ],
  },
  {
    id: 'ce',
    logo: ceLogo,
    docs: [
      { id: 'ceMdd43', file: 'TaiDoc (MDD EXT 20190622) G1 052126 0043 Rev.03.pdf' },
      { id: 'ceMdd43a', file: 'TaiDoc (MDD EXT 20190622) G1 052126 0043 Rev.03 A.pdf' },
      { id: 'ceMdd64', file: 'TaiDoc (MDD 14SA 20200108) G1 052126 0064 Rev.00.pdf' },
      { id: 'ceIvdd', file: 'TaiDoc (IVDD EXT 20220429) V1 052126 0069 Rev.03.pdf' },
    ],
  },
  {
    id: 'brasil',
    logo: anvisaLogo,
    docs: [{ id: 'anvisaBpf', file: 'Brazil GMP Certificate.pdf' }],
  },
]

/** Endereço do PDF (o nome tem espaço, parêntese e &). */
export const pdfUrl = (file: string) => PDF_BASE + encodeURIComponent(file)
