function crawlingNewBooks() {
  var url: string = "https://www.hanmoto.com/ci/bd/search/hdt/%E6%96%B0%E3%81%97%E3%81%8F%E7%99%BB%E9%8C%B2%E3%81%95%E3%82%8C%E3%81%9F%E6%9C%AC/sdate/today/created/today/order/desc/vw/rss20"


  let xml: string = UrlFetchApp.fetch(url).getContentText();

  let bookList: BookList = parseXML(xml);

  let pubDateJST = bookList.uploadDate.toLocaleDateString('japanese', { year: 'numeric', month: 'long', day: 'numeric' });
  let activeSpreadsheet: GoogleAppsScript.Spreadsheet.Spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  let todaysSheet: GoogleAppsScript.Spreadsheet.Sheet = createOrReplaceSheet(activeSpreadsheet, pubDateJST)

  bookList.books.forEach(async book => {
    let isbn = book.isbn;
    let openbdRes = await requestOpenbd(isbn);
    book.addInfoFromOpenbd(openbdRes);
  });

  bookList.toRows().forEach(row => {

    // ISBN, PublishDate, Title+Authors, Category, URL
    todaysSheet!.appendRow(row.toArray());
  });
}

function createOrReplaceSheet(ss: GoogleAppsScript.Spreadsheet.Spreadsheet, name: string): GoogleAppsScript.Spreadsheet.Sheet {

  let namedSheet = ss.getSheetByName(name);
  if (namedSheet != null) {
    ss.deleteSheet(namedSheet);
  }

  let newSheet = ss.insertSheet(name);

  return newSheet
}

interface openbdResponse {
  isbn: string;
  title: string;
  volume: string;
  series: string;
  publisher: string;
  pubdate: string;
  author: string;
  datemodified: string;
  datecreated: string;
  datekoukai: string;
  ccode: string;
}

async function requestOpenbd(isbn: string): Promise<openbdResponse> {
  let url = `https://api.openbd.jp/v1/get?isbn=${isbn}&pretty`
  let res = await fetch(url);
  let jsonResp = await res.json();

  let parsedResp: openbdResponse = {
    ...jsonResp[0]["hanmoto"],
    ...jsonResp[0]["summary"],
    ccode: jsonResp[0]["onix"]["DescriptiveDetail"]["Subject"][0]["SubjectCode"]
  }

  return parsedResp
}

class BookList {
  public uploadDate: Date;
  private lastUpdatedDate: Date;

  public books: Array<BookInfo> = [];

  constructor(createdDate: string, lastUpdatedDate: string) {
    this.uploadDate = new Date(createdDate)
    this.lastUpdatedDate = new Date(lastUpdatedDate);
  }

  addBook(book: BookInfo) {
    this.books.push(book)
  }

  toRows(): Array<SheetRow> {
    let header = new SheetRow(
      'ISBN',
      '出版予定日',
      'タイトル・著者・出版社',
      'カテゴリー',
      'Hanmoto URL',
      'リスト作成日時',
      '最終更新日時',
    );

    let rows: Array<SheetRow> = [header];
    this.books.forEach(newBook => {

      let row = new SheetRow(
        newBook.extractISBN(),
        newBook.pubDate.toISOString(),
        newBook.title,
        newBook.categories.join(', '),
        newBook.url,
        this.uploadDate.toISOString(),
        this.lastUpdatedDate.toISOString(),
      )
      rows.push(row);
    });

    return rows
  }
}

class SheetRow {
  private isbn: string;
  private pubDate: string;
  private title: string;
  private categories: string;
  private url: string;
  private createdDate: string;
  private lastUpdatedDate: string;

  constructor(isbn: string, pubDate: string, title: string, categories: string, url: string, createdDate: string, lastUpdatedDate: string) {
    this.isbn = isbn;
    this.pubDate = pubDate;
    this.title = title;
    this.categories = categories;
    this.url = url;
    this.createdDate = createdDate;
    this.lastUpdatedDate = lastUpdatedDate;
  }

  toArray(): Array<string> {
    return [this.isbn, this.pubDate, this.title, this.categories, this.url, this.createdDate, this.lastUpdatedDate]
  }

}

class BookInfo {
  public isbn: string;
  public title: string;
  public url: string;
  public authors: string = "";
  public series: string = "";
  public volume: string = "";
  public ccode: string = "";
  public createdDate: Date = new Date("");
  public lastUpdatedDate: Date = new Date("");
  public pubDate: Date;
  public categories: Array<string>;

  constructor(title: string, url: string, pubDate: string, categories: Array<string>) {
    this.title = title;
    this.url = url;
    this.pubDate = new Date(pubDate);
    this.categories = categories;
    this.isbn = this.extractISBN();
  }

  extractISBN(): string {
    let split_url = this.url.split('/')
    let isbn = split_url[split_url.length - 1];
    return isbn
  }

  addInfoFromOpenbd(resp: openbdResponse) {

  }
}

function parseXML(xml: string): BookList {
  let document = XmlService.parse(xml);
  let root = document.getRootElement();

  let channel = root.getChild('channel');
  let listPubDateText = channel.getChild('pubDate').getText();
  let listUpdateDateText = channel.getChild('lastBuildDate').getText();

  let bookList = new BookList(listPubDateText, listUpdateDateText);

  let items = channel.getChildren('item');
  items.forEach(item => {
    let title = item.getChild('title').getText();
    let url = item.getChild('link').getText();

    let pubDateText = item.getChild('pubDate').getText();

    let categoryElement = item.getChildren('category');
    let categories = categoryElement.map(category => category.getText());

    let book = new BookInfo(title, url, pubDateText, categories);
    bookList.addBook(book)
  });
  return bookList
}

export { crawlingNewBooks, parseXML, BookList, BookInfo, SheetRow, openbdResponse };
