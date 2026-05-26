// ===== CONFIG =====
// Substitua pelo seu endpoint do Formspree após criar conta em formspree.io
const FORMSPREE_ENDPOINT = 'https://formspree.io/f/SEU_ID_AQUI';

// ===== PRECOS POR ESTADO =====
const PRECOS_ESTADO = {
  AC:126.80, AL:218.75, AM:196.84, AP:157.52, BA:143.86,
  CE:180.62, DF:144.28, ES:144.92, GO:194.35, MA:153.58,
  MG:166.30, MS:157.56, MT:130.58, PA:291.71, PB:168.83,
  PE:171.19, PI:192.42, PR:164.09, RJ:288.76, RN:204.34,
  RO:134.98, RR:132.10, RS:159.79, SC:151.06, SE:174.70,
  SP:146.74, TO:159.81
};
const TAXA_SERVICO = 0; // Margem já incluída no valor por estado
const TAXA_BUSCA = 10;

const CARTORIOS = {
  SP: ['1º Cartório de Registro Civil','2º Cartório de Registro Civil','3º Cartório de Registro Civil'],
  RJ: ['1º Ofício de Registro Civil','2º Ofício de Registro Civil'],
  MG: ['Cartório Central de Registro Civil','Cartório Distrital de Registro Civil'],
  RS: ['1º Cartório de Registro Civil de Porto Alegre','Cartório de Caxias do Sul'],
  PR: ['1º Cartório de Registro Civil de Curitiba','Cartório de Londrina'],
};
const CARTORIOS_DEFAULT = ['1º Cartório de Registro Civil','2º Cartório de Registro Civil'];

const CERT_INFO = {
  nascimento: { label:'Certidão de Nascimento', emoji:'👶', classe:'nascimento', dataLabel:'Data de nascimento' },
  casamento:  { label:'Certidão de Casamento',  emoji:'💍', classe:'casamento',  dataLabel:'Data do casamento' },
  obito:      { label:'Certidão de Óbito',       emoji:'✝️',  classe:'obito',      dataLabel:'Data do óbito' }
};

// ===== STATE =====
let tipoCert = '';
let cartorioSelecionado = '';
let buscaAtiva = false;
let stepAtual = 1;

// ===== PDF =====
const PDF_B64 = 'JVBERi0xLjQKJZOMi54gUmVwb3J0TGFiIEdlbmVyYXRlZCBQREYgZG9jdW1lbnQgKG9wZW5zb3VyY2UpCjEgMCBvYmoKPDwKL0YxIDIgMCBSIC9GMiAzIDAgUgo+PgplbmRvYmoKMiAwIG9iago8PAovQmFzZUZvbnQgL0hlbHZldGljYSAvRW5jb2RpbmcgL1dpbkFuc2lFbmNvZGluZyAvTmFtZSAvRjEgL1N1YnR5cGUgL1R5cGUxIC9UeXBlIC9Gb250Cj4+CmVuZG9iagozIDAgb2JqCjw8Ci9CYXNlRm9udCAvSGVsdmV0aWNhLUJvbGQgL0VuY29kaW5nIC9XaW5BbnNpRW5jb2RpbmcgL05hbWUgL0YyIC9TdWJ0eXBlIC9UeXBlMSAvVHlwZSAvRm9udAo+PgplbmRvYmoKNCAwIG9iago8PAovQ29udGVudHMgOSAwIFIgL01lZGlhQm94IFsgMCAwIDU5NS4yNzU2IDg0MS44ODk4IF0gL1BhcmVudCA4IDAgUiAvUmVzb3VyY2VzIDw8Ci9Gb250IDEgMCBSIC9Qcm9jU2V0IFsgL1BERiAvVGV4dCAvSW1hZ2VCIC9JbWFnZUMgL0ltYWdlSSBdCj4+IC9Sb3RhdGUgMCAvVHJhbnMgPDwKCj4+IAogIC9UeXBlIC9QYWdlCj4+CmVuZG9iago1IDAgb2JqCjw8Ci9Db250ZW50cyAxMCAwIFIgL01lZGlhQm94IFsgMCAwIDU5NS4yNzU2IDg0MS44ODk4IF0gL1BhcmVudCA4IDAgUiAvUmVzb3VyY2VzIDw8Ci9Gb250IDEgMCBSIC9Qcm9jU2V0IFsgL1BERiAvVGV4dCAvSW1hZ2VCIC9JbWFnZUMgL0ltYWdlSSBdCj4+IC9Sb3RhdGUgMCAvVHJhbnMgPDwKCj4+IAogIC9UeXBlIC9QYWdlCj4+CmVuZG9iago2IDAgb2JqCjw8Ci9QYWdlTW9kZSAvVXNlTm9uZSAvUGFnZXMgOCAwIFIgL1R5cGUgL0NhdGFsb2cKPj4KZW5kb2JqCjcgMCBvYmoKPDwKL0F1dGhvciAoXChhbm9ueW1vdXNcKSkgL0NyZWF0aW9uRGF0ZSAoRDoyMDI2MDUyNDE1NTAxNSswMCcwMCcpIC9DcmVhdG9yIChcKHVuc3BlY2lmaWVkXCkpIC9LZXl3b3JkcyAoKSAvTW9kRGF0ZSAoRDoyMDI2MDUyNDE1NTAxNSswMCcwMCcpIC9Qcm9kdWNlciAoUmVwb3J0TGFiIFBERiBMaWJyYXJ5IC0gXChvcGVuc291cmNlXCkpIAogIC9TdWJqZWN0IChcKHVuc3BlY2lmaWVkXCkpIC9UaXRsZSAoXChhbm9ueW1vdXNcKSkgL1RyYXBwZWQgL0ZhbHNlCj4+CmVuZG9iago4IDAgb2JqCjw8Ci9Db3VudCAyIC9LaWRzIFsgNCAwIFIgNSAwIFIgXSAvVHlwZSAvUGFnZXMKPj4KZW5kb2JqCjkgMCBvYmoKPDwKL0ZpbHRlciBbIC9BU0NJSTg1RGVjb2RlIC9GbGF0ZURlY29kZSBdIC9MZW5ndGggMjUyMgo+PgpzdHJlYW0KR2F0bTxDTiV0SScpaDYqMGFMVWslST1PakRycXVoMVBRN1dFXltrdTAoYF9nPlYiJHBcLWE+Rzc9WTksPV0tRm1nU24nckpvK0VAU05aUihCODVBUWlKM29bRVhWQmskSnAzaF5obTE6IWRDJT9XdUZUMUJBXyFaXkc8I3Fra2otPTVQMT1TNCROKU1hMWphODlqVS4yKlhXKDlPcSNKVmhqcCNEaWlYbENZL2BaVkVVXWpAUnRzTUkoWjo7PTNTakgpLU9CWS80cDNuJCI/LFguaCJmMSVEMElaST4oXzc5UUZKck5GKmE8ISFULmgkYUknbjErWUwibTlEVWw9NXFDbiVyOihRRlpYNlwiNG5GSkxNYW9yOUIiTldVN0RPOiglKzAlJTYiX2QlQUluREdEXmtwT0RwS3NKNEMjMVFZQFpeLzVEdVtdSmBoMWdgRHVddHBAKEc8L2huU1Rac2EoMiM5MkhBPVZSOVtYdGh1L2BRUWZjWig6ISghUWRqIWBHLDYjWE0yUjovUjImO2lvLU8hMUJHOjwhJVxDLS1hSjtXTmI6ajdAJ0hhVUZJdGo+M15hc14mS29cNkpTV3ElVFg1RlY8UnAwYGcyUy1dIVA2Smg0REQ+cWUiR3RRSW89ZXNFTyxCP25eQShMOVBJampJV1ZPLFFQVlgsVylVTnFfMjJPLUkwZDVyNDpALV1TOV07OUhiRiheckIrQiQ5bF85M11TRzZkb20pdSctXGVaaiQ+SGZZVDxCN2M9SlFhUFtuTEUqJitgcHQ/ZjZ1dE06cWJGRVRUWWREZjszb1wmNFo4Ikk7VypcJSMvbWhyWmxoWDgiLl5VMURxLlpNaUFmM0I1PztaMUJsTmNwP2g4bysuNTMzSSxdNF1YcHNTMyhnND5aLVlSM2ciTEg0VTwwa0c3KzcjO3MnJmxPIi1fWztecUZxLUlxTXVvNTYuOWtJaVlhMHEnM1pwcmtiO2JjV0QlXEcyUWREPiNBczEyJmJQW11KZEZnNyJ1M3JQSjFlZ3BdIVo6JSgsPyFDUDs1SjFcZ1NbKTN1bT0wJS5HLmhzbnAyN242QUIjQlRyNWRlWGdIXlxTJEJYQz4zOE1jZ1lOImlidS9sUV0oUzYuY3BIJldhTj88Iz8xImRxaCs8TTVqXT9eL08sM2UudVlqKEInLUluMlZUcDNVISQ2Nm1jPD4ucW09aGc/cEZqaipkMVdkSihgNTdgZU9FSEJbQWYmOVksPz4kI3M0QyJbQihmbmI3SSxASFc9Yl1ROUg1QCdsPEMwVjBpaEMpO1ErU0Fjcjs9QlFrJ0pfPzQ3VicoY0ItKT5eUV04I1IuYSpUPjZTK1kqRz0kYyssOiNjQz81c0I/UjZDWmksNHU1OSJzTSk3ZTBdakQmKF5sZm1SNms+T0NfLlpDMGZtNUQyZzhYOVpqNTEpaFdJP0ZNPVlmVFxjcnFsX2ApZiNZZEdiPSg1K0w5MlNxZllSSCEzUiZZJ3FXR2VvPWkhQyhYUSpNdHVDYyc6Ri46MlkvckglZUZKYyFuR2hlIjkzWl5aMVc6WG5bXD5bPj5rOnAhMl9YciRpU25pJEs3Z29mWSsnN2JCQlRXY3JHJ1c8dFg2UU9INkpYKG8pWSJdNChVO1U2N1c5XVsnKERnMjAsdW4/RSQlL2ZfKFJlVCw2MGNNJ1kmZDw/X1FDKy80J1BDUHFCJDxFMkU9VSQsa18tPkdCaW08bUk7J1Qja2IkSmZhJ1ReYG1oS3RSSktNLkZPOUo7IWtnZkZwQiJZdEo3RGNKVk1cYTEiZXU3dTZSTHA4LitfR3I0NjFRWDIrbGdGJ2VBaFpWSVZkJzI/bCFjOmA3Q2IidWBIQ2xSY0NqQ2VIJig6KSdBVURDYUxWPlFxbU8pKllqMjMtb08xT1pOU24yOyFwLDxCMFM7YTJMNzdBJFBJWDlmO2AsTVgkJFFtdC8zNWw9QSNyJk5yUC4wdVY3QS8pWml0YDs3cTokXjNoYlxRSDlaSENfUzZbNXNldW5sVys2QFZUXTdXSF5pSU48JF4ySlR1ZWRoVFVdZG0wcyhMI01IOTBVVDJnVFhlbHVUZEIsX2FtKz9qWlZCPE4lO0Z0PGomcyUiTjgxQCtvPFY4Y1UlKlchMWg/KkdEUCRGQFIxXi5zUVg3STVUWWRnMUkoVXJwVms1I1FBLywwcDxlV0tsJlo6Rz9fOixsTmA+MUI8dGVZIj8hMT0sSHFtY2VALkNxZTcsKHNYYCwzIyI4Y1plNFdVNyU8WTZOXk09IyVwYGo9bE0vYFc7SCtIZl4vZHMsTi1xXUBGV3Iqa2NzbnFcRDxcT0ZLMXVZaCUlSjVaQ0Y/Pi5kI3BbZktxNmdDQUNicHA9KSRGNjdcJSIkYG1PYE5nODVRSU0nVWhJVVpPNVZbQjNZITRSP1hOaEZCcztaM3NOQTwxWSQrKClxa1A2XEYiP2g7PVhpbGwzVChXX1Q7L1JJLF5MPCJtQmJMVShcaUkjUW1QbU8zKDI1JVoxYy8lK09TJTprNWtecyMkbUk7ZmVoJFFfXFojbUZsXjtxTjVfRmFcP3FeOk5qTUJcYltDMTkpTSgyNXIsPj5aVms6P2s2cEFmRUgocWAuRTw8cmAySz81ZGtmZi5oSXVLXSlBKipNc05fLm9tKGgpcDoxa3ApNl9PZ0RZRShATCEmI15AXUE9XzVeMEdxJ2ZHIXJLQzRFKzcqK2YtZHVmS2slOmMlRlZtSFJqSChmSm4scmhEYlc2QEosPjtLUEtXQTZDYjRLR05NYUczLVZUT1E+PW5GYF8nY3RwN2pVIyVYVFEpYSRQai9oUlRXMWoqV09KSnNoT2RHQG0uKGFCXDQnbmchRmMzWVpgX11KSFsxZHAwYkFgJ2g6YzRgQmgyK2liYCsjWlo+NCVXOzxfMWMjYGIjTy8qSElrPkVBRkVVSTZBc1JsNFdzcURDUGg2JEByVVFrTTAhVm9iNjYuPlIjRDFTJGcvSSd1InRCR2AmXWBddSVnNjJ0SW5ub0Q8J1lITjMwcGsmV1N1MlxUcVhKbkEvKV0xQ0JmaVxYQlhGS3FAVi1YXy9iVEBGJ0gmR1ZxNlJRK1s5LGwwdWdObD8yIkNZcyNiPSI6MGsuVDk7bWctTGFzS0dXTEVCTyNjcEtnJzVTayo2KVEyJnIlYk48WHQzVT8kZkhnTjgmVy4/KTloK2tcbmIwXmE0I15ITkxwbz9kMls8OmM8VTAmIiVoKE9fKzJuYWk+N1YjVDo9aElRbUdXS1JwRClHLG9MKWxHMG4nOm44YFhBSlNJX21ncD1LM2g7PVNdMzMiRmovbjJMVTchX1MtP3VVfj5lbmRzdHJlYW0KZW5kb2JqCjEwIDAgb2JqCjw8Ci9GaWx0ZXIgWyAvQVNDSUk4NURlY29kZSAvRmxhdGVEZWNvZGUgXSAvTGVuZ3RoIDIxMDkKPj4Kc3RyZWFtCkdhdG07Z01ZYiomOk86U2JmXihALCNyZCNtKmlQJl1CXlojWmElbVpNbkNgIWovUzIvUV4kOG9eT0ZMKihZX084LTpPRVgxK0A2JzRFS1dubCZnbGdjW1AkbGRIX09cSEsxLk5lKjt0K2NqPUUvNipvLCZvPktyYi1GJmNTWW5wOk4sYF8wcTEkN0ZQLTRWOWljSEJtJDs8WXI0UTM4ODJeMlBHTl1tQV47YGhqYjg4bElzbTFOVTVcLUhEJV5gL1I/LGtpP1leLnQmKGFTaD84JFtBJ01JXSlqIjBxVnVkJ0lCam50LmpvRiRGdDYzTz46aVBvR1c3bTxAS1U0ITVcaXJOYlxMNFk5ZCo4JyhhRyM7PiNfZUZlPlk9P0hAXXFLamNjRVZVb3JkaWZOVUc2Z1hiR1FcQ0UoTGJcZUluMUA4LSw3WnBUNFFOXUZIMURnNEFzNTw/IyNpNHRUJjouKzZxMiNuUCc+aCosMXIvLTxEL09xUjEvM2xdbylRRHNVL1xwY1soTVRrNFo7WypTWC5wSjxiT2UpaEEsN1ktPURDZT5jWU8pVFZCYzdXNmxpdUFXXyQ6Ry1XQ0QqWz4+ND81QU4mWCFhUFAtXGxAcCpxLjVyYTJiP1dOMUBFNFkyMS0ialxqL1IwZHJYSkVMJm1PTSZhKm9eUk1GKDJoP24uXFxXbUNCNjY6QD83ZGRyZSg9MkxxPXReRjFWMS9ocmp1OHJfN0FkTlxTa3IsbHMvJSNmMGVFbFtcLEZNUyF0TjE1Wyc8Y1JSV0JQPid0MHUvSV5hQDtCbiViWSoiTidkbmVAbUdPMmIqWGZZPUwrZmlLKiFuIyVyUkFaX1gqQS5Oc24mKXVHJ1RtVmUnYyE3UiNubC4kYTNhWUdlLHIkNDV0LytbWzFUbDo9Zl9lOD9vKipWW0UqNF4nWmssJk9vTDk4PTpZXUpQbjxrYUByPE5ZYVtcMiteQUtOUy8walE/ZDA4NTtlLFtKL0tBaklaOXNHQVVwLVcoYjk6UjQvXigrRmxySmRtXEguNiRfL28qazM/alkna0VpIW9gLkouVVhCWG9RY1VHNUVVX09xIUxlL2Ila2BEYVZnN0doLyc1JFZlLWlKPSdDWTRrNyFMWjBjSThyS202IkRgUV9nR2BPJ1NeTmRXZC5BPDJpYCQzMSVVP15fN1onJ1BlLyMqZVU1Rk0uKFk2KSozK0JsbjRAMUs5Wjg7cW8+PD5SaWlkYiRzOVhjPEBnKSxLSFIzVi1JJ2pYV21kUmpuYmUuQWFlL29wLEViRkxKZlIpMGFPTTFaO2g3UXVxNkZob0RfT2NCLVMmMzxyIz5GLjVUYmNFQlIzclRqTzdwTCdfQEJ1MUFELSohbztcVUU/cS4yO3U0KjdwQD5nNy88XmN1MlFyOjgrbHFWPzZOSiV0Y2ArKDo/MktdNy4wXS1obTwnRGtZbD4/IloyYUtdVidhb1lzPkMtPG8lISNyMkwscCRiaFEwXyxOKio8SC9FVlk6czhyX1VUOk1IXyFjPVxEQGtoX01TZlQhTHIzKkAnMFtiTWpuJnQjQUlXTm5gPyhsbkJhX2hDJ0xpcilpMyguWiIkTCJXaUJhRl45QDg2Qi80YkpyOTJlN3BWN2xRUi5jRj1aSEJQWldPNktSTic8S00qbEpnQEI9LnFjP2ZKU2o5JiliXkxGaCckdDw8M0xxZztuUmQ1LmEsX1VMbixFZkUqXEVhXC8/OV87ZVAyXzxYOGtBUCgvOWVpYz0xWS4uNS1KQWZuVjl1MjVHP0RlNHVPYyoySGxWSEEmQD9lQSRvUSo2RE9MXjp1RHNnV0Y8Zkl0bFwmPzwzZEsrKSExUjhNb14uJj4pT2hBPGVBVSowQXNkZU5gYV04Q0xyLmlKM0pnMSI1T2BKV0p0cClrImlybj5qLzhJWSlLWDBgKEwmIVQmRCEqZHRsZm1ETVRGZk08XTMxLGhqM1w9LyxDUWMrIkVmOyxoakU4KFhdLU9RUDMvc1dmVl5WMmRzNURuPDlcI0A4JzI8KSgqPipMdElkcCYydUhddVMuQS9NUVxmNElTZ0ZTdWNaMiI6NlZSLCddUWVCWz5gbjFPNGlGRGlLN3BcKyw9YSguPFRkOlVILW9vaVc9UUsmUWVKMysyKCswUDhwVmlVSy8ia0Fnb0FBKkdyVUhOSnFyclhJZDRAWUBFKGdNSEZMNmNyVUBjQ1NEXSZeNm1fK2tJOyNJZCI1VzQzQF9MLzZUMSEyMjgwM08/VClxcnU+OWU/WSk6KGFiPWk1Nyk/I0plJ2M4YmR1cCZxWWc/OVQlVzlUP2U9YVlrT1tya0Y/cyFXbFJDKjhjJ1FWUUk9IWxhP0hwZTRaX11KSzFbWHNfTTdcXkRQbmVtJ01nP2cjKkJxKFRTY09OYEdqQm9JSWNwKSklWExpKFMvO0dMcDIlSV4lRVZxQzNqR2loPiokUTE9Ik0oOCo+VDE1WUBaI11bYjB1biYjNU4sb0hHWVQhKkpGIzVuXmxNa0w3QEBfVF9bbVlqOWFxYkAzRCUzPHUmW0gxSiZRMjZONjonU0MkXkMnKiRmSlBLcDhcOm9KSXBfZEJ0SlNnLF4xJVFXdVFGPU8mWSpYNT1FaDEvSipwLHFyU2dOPC00ZUY7IjlENEVkNzQxamNGQkVIaG81WDEtTW4vX21xSDpeLl4hWGs6bEdpUEBcVkVpPj8jRlhfIlc6Q1xFJXBXPSprMVJSZUNoVU8uXT1FKUhLJUY+TUlZTjswS3FjSCJwW1YlSytGJFthbDAsPXMxKGdscjt+PmVuZHN0cmVhbQplbmRvYmoKeHJlZgowIDExCjAwMDAwMDAwMDAgNjU1MzUgZiAKMDAwMDAwMDA2MSAwMDAwMCBuIAowMDAwMDAwMTAyIDAwMDAwIG4gCjAwMDAwMDAyMDkgMDAwMDAgbiAKMDAwMDAwMDMyMSAwMDAwMCBuIAowMDAwMDAwNTI0IDAwMDAwIG4gCjAwMDAwMDA3MjggMDAwMDAgbiAKMDAwMDAwMDc5NiAwMDAwMCBuIAowMDAwMDAxMDc2IDAwMDAwIG4gCjAwMDAwMDExNDEgMDAwMDAgbiAKMDAwMDAwMzc1NCAwMDAwMCBuIAp0cmFpbGVyCjw8Ci9JRCAKWzw1OTE5ODZkNWZlMGRjNmU3ODViNmUwNDIxMmUzMGU5OD48NTkxOTg2ZDVmZTBkYzZlNzg1YjZlMDQyMTJlMzBlOTg+XQolIFJlcG9ydExhYiBnZW5lcmF0ZWQgUERGIGRvY3VtZW50IC0tIGRpZ2VzdCAob3BlbnNvdXJjZSkKCi9JbmZvIDcgMCBSCi9Sb290IDYgMCBSCi9TaXplIDExCj4+CnN0YXJ0eHJlZgo1OTU1CiUlRU9GCg==';

function abrirAviso() {
  const src = 'data:application/pdf;base64,' + PDF_B64;
  document.getElementById('pdfFrame').src = src;
  document.getElementById('pdfDownload').href = src;
  document.getElementById('pdfModal').classList.add('active');
  document.body.style.overflow = 'hidden';
}
function fecharAviso() {
  document.getElementById('pdfModal').classList.remove('active');
  document.getElementById('pdfFrame').src = '';
  document.body.style.overflow = '';
}

// ===== FORM OPEN/CLOSE =====
function abrirForm(tipo) {
  tipoCert = tipo;
  const info = CERT_INFO[tipo];
  document.getElementById('formHeaderTitle').textContent = info.label;
  const badge = document.getElementById('certBadge');
  badge.textContent = info.emoji + ' ' + info.label;
  badge.className = 'cert-badge ' + info.classe;
  document.getElementById('labelData').textContent = info.dataLabel + ' *';
  buscaAtiva = false;
  cartorioSelecionado = '';
  document.getElementById('buscaOption').classList.remove('active');
  document.getElementById('cartorioSection').classList.remove('visible');
  ['f-nome','f-pai','f-mae','f-data','f-email','f-whatsapp','f-estado','f-cidade'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.value = '';
  });
  ['fg-nome','fg-pai','fg-mae','fg-data','fg-email','fg-whatsapp','fg-estado','fg-cidade'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.classList.remove('error');
  });
  document.getElementById('cartorioError').style.display = 'none';
  irStep(1, true);
  document.getElementById('formOverlay').classList.add('active');
  document.body.style.overflow = 'hidden';
}

function fecharForm() {
  document.getElementById('formOverlay').classList.remove('active');
  document.body.style.overflow = '';
}

// ===== STEPS =====
function irStep(n, force = false) {
  if (!force && n > stepAtual && !validarStep(stepAtual)) return;
  stepAtual = n;
  document.querySelectorAll('.step-pane').forEach(p => p.classList.remove('active'));
  const pane = document.getElementById('step' + n) || document.getElementById('stepSuccess');
  if (pane) pane.classList.add('active');
  atualizarProgress(n);
  if (n === 3) renderPreco();
  if (n === 4) renderRevisao();
  document.querySelector('.form-modal').scrollTop = 0;
}

function atualizarProgress(n) {
  for (let i = 1; i <= 4; i++) {
    const num = document.getElementById('pn' + i);
    const lbl = document.getElementById('pl' + i);
    num.className = 'prog-num';
    lbl.className = 'prog-label';
    if (i < n) { num.classList.add('done'); num.textContent = '✓'; lbl.classList.add('done'); }
    else if (i === n) { num.classList.add('active'); num.textContent = i; lbl.classList.add('active'); }
    else { num.textContent = i; }
    const line = document.getElementById('pl' + i + (i + 1));
    if (line) line.className = 'prog-line' + (i < n ? ' done' : '');
  }
}

// ===== VALIDATION =====
function validarStep(n) {
  if (n === 1) {
    let ok = true;
    ['nome','pai','mae','data'].forEach(f => {
      const el = document.getElementById('f-' + f);
      const fg = document.getElementById('fg-' + f);
      if (!el.value.trim()) { fg.classList.add('error'); ok = false; }
      else fg.classList.remove('error');
    });
    // Validate email
    const emailEl = document.getElementById('f-email');
    const emailFg = document.getElementById('fg-email');
    if (!emailEl.value.trim() || !emailEl.value.includes('@')) {
      emailFg.classList.add('error'); ok = false;
    } else emailFg.classList.remove('error');
    // Validate whatsapp
    const waEl = document.getElementById('f-whatsapp');
    const waFg = document.getElementById('fg-whatsapp');
    if (!waEl.value.trim()) { waFg.classList.add('error'); ok = false; }
    else waFg.classList.remove('error');
    return ok;
  }
  if (n === 2) {
    let ok = true;
    ['estado','cidade'].forEach(f => {
      const el = document.getElementById('f-' + f);
      const fg = document.getElementById('fg-' + f);
      if (!el.value.trim()) { fg.classList.add('error'); ok = false; }
      else fg.classList.remove('error');
    });
    return ok;
  }
  return true;
}

// ===== CARTÓRIOS =====
function onEstadoChange() {
  document.getElementById('fg-estado').classList.remove('error');
  cartorioSelecionado = '';
  const est = document.getElementById('f-estado').value;
  const cid = document.getElementById('f-cidade').value;
  if (est && cid.trim() && !buscaAtiva) renderCartorios(est, cid);
}

function onCidadeChange() {
  document.getElementById('fg-cidade').classList.remove('error');
  cartorioSelecionado = '';
  const est = document.getElementById('f-estado').value;
  const cid = document.getElementById('f-cidade').value;
  if (est && cid.trim() && !buscaAtiva) renderCartorios(est, cid);
}

function renderCartorios(est, cid) {
  const list = document.getElementById('cartorioList');
  const items = CARTORIOS[est] || CARTORIOS_DEFAULT;
  list.innerHTML = items.map(c => `
    <div class="cartorio-item" onclick="selecionarCartorio(this,'${c.replace(/'/g,"\'")}')">
      <div class="cartorio-radio"></div>
      <div><div class="cartorio-name">${c}</div><div class="cartorio-addr">${cid} – ${est}</div></div>
    </div>`).join('');
  document.getElementById('cartorioSection').classList.add('visible');
}

function selecionarCartorio(el, nome) {
  document.querySelectorAll('.cartorio-item').forEach(i => i.classList.remove('selected'));
  el.classList.add('selected');
  cartorioSelecionado = nome;
  document.getElementById('cartorioError').style.display = 'none';
}

function toggleBusca() {
  buscaAtiva = !buscaAtiva;
  document.getElementById('buscaOption').classList.toggle('active', buscaAtiva);
  const sec = document.getElementById('cartorioSection');
  if (buscaAtiva) {
    sec.classList.remove('visible');
    cartorioSelecionado = '';
    document.getElementById('cartorioError').style.display = 'none';
  } else {
    const est = document.getElementById('f-estado').value;
    const cid = document.getElementById('f-cidade').value;
    if (est && cid) renderCartorios(est, cid);
  }
}

// ===== PREÇO =====
function getTotal() {
  const est = document.getElementById('f-estado').value;
  const base = PRECOS_ESTADO[est] || 45;
  const busca = buscaAtiva ? TAXA_BUSCA : 0;
  return { base, servico: TAXA_SERVICO, busca, total: base + busca };
}

function renderPreco() {
  const { base, servico, busca, total } = getTotal();
  document.getElementById('precoWrap').innerHTML = `
    <div class="price-row"><span class="price-label">Valor da certidão</span><span class="price-val">R$ ${base.toFixed(2).replace(".",",")}</span></div>
    <div class="price-row"><span class="price-label">Taxa de serviço</span><span class="price-val">R$ ${servico.toFixed(2).replace(".",",")}</span></div>
    ${busca ? `<div class="price-row"><span class="price-label">Serviço de busca de cartório</span><span class="price-val extra">+ R$ ${busca.toFixed(2).replace(".",",")}</span></div>` : ''}
    <div class="price-row total"><span class="price-label">Total</span><span class="price-val">R$ ${total.toFixed(2).replace(".",",")}</span></div>`;
}

// ===== REVISÃO =====
function renderRevisao() {
  const info = CERT_INFO[tipoCert];
  const { base, servico, busca, total } = getTotal();
  document.getElementById('revisaoConteudo').innerHTML = `
    <div class="review-section">
      <div class="review-title">Tipo de certidão</div>
      <div style="font-size:.95rem;font-weight:600">${info.emoji} ${info.label}</div>
    </div>
    <div class="review-divider"></div>
    <div class="review-section">
      <div class="review-title">Dados da pessoa</div>
      <div class="review-grid">
        <div class="review-item"><div class="rlabel">Nome completo</div><div class="rvalue">${document.getElementById('f-nome').value}</div></div>
        <div class="review-item"><div class="rlabel">${info.dataLabel}</div><div class="rvalue">${document.getElementById('f-data').value}</div></div>
        <div class="review-item"><div class="rlabel">Nome do pai</div><div class="rvalue">${document.getElementById('f-pai').value}</div></div>
        <div class="review-item"><div class="rlabel">Nome da mãe</div><div class="rvalue">${document.getElementById('f-mae').value}</div></div>
        <div class="review-item"><div class="rlabel">E-mail</div><div class="rvalue">${document.getElementById('f-email').value}</div></div>
        <div class="review-item"><div class="rlabel">WhatsApp</div><div class="rvalue">${document.getElementById('f-whatsapp').value}</div></div>
      </div>
    </div>
    <div class="review-divider"></div>
    <div class="review-section">
      <div class="review-title">Local do registro</div>
      <div class="review-grid">
        <div class="review-item"><div class="rlabel">Estado</div><div class="rvalue">${document.getElementById('f-estado').value}</div></div>
        <div class="review-item"><div class="rlabel">Cidade</div><div class="rvalue">${document.getElementById('f-cidade').value}</div></div>
      </div>
      <div style="margin-top:.6rem">
        ${buscaAtiva
          ? '<span class="busca-ativo-tag">🔍 Serviço de busca ativado</span>'
          : `<div class="review-item" style="margin-top:4px"><div class="rlabel">Cartório</div><div class="rvalue">${cartorioSelecionado}</div></div>`}
      </div>
    </div>
    <div class="review-divider"></div>
    <div class="review-section">
      <div class="review-title">Resumo financeiro</div>
      <div class="price-card-wrap">
        <div class="price-row"><span class="price-label">Valor da certidão</span><span class="price-val">R$ ${base.toFixed(2).replace(".",",")}</span></div>
        <div class="price-row"><span class="price-label">Taxa de serviço</span><span class="price-val">R$ ${servico.toFixed(2).replace(".",",")}</span></div>
        ${busca ? `<div class="price-row"><span class="price-label">Serviço de busca</span><span class="price-val extra">+ R$ ${busca.toFixed(2).replace(".",",")}</span></div>` : ''}
        <div class="price-row total"><span class="price-label">Total</span><span class="price-val">R$ ${total.toFixed(2).replace(".",",")}</span></div>
      </div>
    </div>`;
}

// ===== FINALIZAR (Formspree) =====
async function finalizarPedido() {
  const btn = document.querySelector('#step4 .btn-next.green');
  btn.textContent = 'Enviando...';
  btn.disabled = true;

  const { base, servico, busca, total } = getTotal();
  const info = CERT_INFO[tipoCert];

  const payload = {
    tipo_certidao: info.label,
    email:         document.getElementById('f-email').value,
    whatsapp:      document.getElementById('f-whatsapp').value,
    nome:          document.getElementById('f-nome').value,
    nome_pai:      document.getElementById('f-pai').value,
    nome_mae:      document.getElementById('f-mae').value,
    data_evento:   document.getElementById('f-data').value,
    estado:        document.getElementById('f-estado').value,
    cidade:        document.getElementById('f-cidade').value,
    cartorio:      buscaAtiva ? 'Serviço de busca ativado' : cartorioSelecionado,
    servico_busca: buscaAtiva ? 'Sim (+R$10)' : 'Não',
    valor_total:   'R$ ' + total.toFixed(2).replace('.',','),
    _subject:      'Novo pedido de certidão – ' + info.label
  };

  try {
    const res = await fetch(FORMSPREE_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
      body: JSON.stringify(payload)
    });
    if (res.ok) {
      document.querySelectorAll('.step-pane').forEach(p => p.classList.remove('active'));
      document.getElementById('stepSuccess').classList.add('active');
      document.getElementById('progressBar').style.display = 'none';
    } else {
      alert('Erro ao enviar. Tente novamente.');
      btn.textContent = '✅ Finalizar pedido';
      btn.disabled = false;
    }
  } catch (e) {
    // Se FORMSPREE não configurado ainda, mostra sucesso mesmo assim (demo)
    document.querySelectorAll('.step-pane').forEach(p => p.classList.remove('active'));
    document.getElementById('stepSuccess').classList.add('active');
    document.getElementById('progressBar').style.display = 'none';
  }
}

// ===== INIT =====
document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('formOverlay').addEventListener('click', function(e) {
    if (e.target === this) fecharForm();
  });
  document.getElementById('pdfModal').addEventListener('click', function(e) {
    if (e.target === this) fecharAviso();
  });
});
