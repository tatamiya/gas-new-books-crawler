
interface CCodeTable {
    _comment?: string,
    taishou: { [key: string]: string },
    keitai: { [key: string]: string },
    naiyou: { [key: string]: string },
}

interface DecodedGenre {
    ccode: string,
    target: string,
    format: string,
    genre: string,
}

class CCodeConverter {
    constructor(private table: CCodeTable) { }

    convert(ccode: string): DecodedGenre | null {

        if (/^-?\d+$/.test(ccode) === false || ccode.length != 4) {
            return null
        }

        let splitCode = ccode.split("");

        let targetCode = splitCode[0];
        let formatCode = splitCode[1];
        let genreCode = splitCode.slice(2, 4).join("");

        let target = this.table.taishou[targetCode] ?? "";
        let format = this.table.keitai[formatCode] ?? "";
        let genre = this.table.naiyou[genreCode] ?? "";

        return <DecodedGenre>{ ccode: ccode, target: target, format: format, genre: genre }
    }

}

function initializeCcodeConverter(): CCodeConverter {
    const userProperties = PropertiesService.getScriptProperties();
    let ccodeTableFileId = userProperties.getProperty('CCODETABLE_FILE_ID')!;

    let ccodeTableJSON = DriveApp.getFileById(ccodeTableFileId).getBlob().getDataAsString('utf8');
    let table = <CCodeTable>JSON.parse(ccodeTableJSON);

    return new CCodeConverter(table)
}

export { initializeCcodeConverter, DecodedGenre, CCodeTable, CCodeConverter };
