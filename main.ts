function crawlingNewBooks() {
  var url = "https://www.hanmoto.com/ci/bd/search/hdt/%E6%96%B0%E3%81%97%E3%81%8F%E7%99%BB%E9%8C%B2%E3%81%95%E3%82%8C%E3%81%9F%E6%9C%AC/sdate/today/created/today/order/desc/vw/rss20"


  let xml = UrlFetchApp.fetch(url).getContentText();

  let bookList = parseXML(xml);

  let pubDateJST = bookList.createdDate.toLocaleDateString('japanese', { year: 'numeric', month: 'long', day: 'numeric' });
  let activeSpreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  let todaysSheet = createOrReplaceSheet(activeSpreadsheet, pubDateJST)

  todaysSheet!.appendRow(bookList.generateHeader());

  bookList.books.forEach(newBook => {

    let row = newBook.toRow(bookList.createdDate, bookList.lastUpdatedDate)

    // ISBN, PublishDate, Title+Authors, Category, URL
    todaysSheet!.appendRow(row);
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

class BookList {
  public createdDate: Date;
  public lastUpdatedDate: Date;

  public books: Array<BookInfo> = [];

  generateHeader(): Array<string> {
    return ['ISBN', '出版予定日', 'タイトル・著者・出版社', 'カテゴリー', 'Hanmoto URL', 'リスト作成日時', '最終更新日時']
  }

  constructor(document: GoogleAppsScript.XML_Service.Document) {
    let root = document.getRootElement();

    let channel = root.getChild('channel');
    let listPubDateText = channel.getChild('pubDate').getText();
    this.createdDate = new Date(listPubDateText);//.toISOString();
    let listUpdateDateText = channel.getChild('lastBuildDate').getText();
    this.lastUpdatedDate = new Date(listUpdateDateText);//.toISOString();

    let items = channel.getChildren('item');
    items.forEach(item => {
      let book = new BookInfo(item);
      this.books.push(book);
    });
  }
}

class BookInfo {
  public title: string;
  public url: string;
  public isbn: string;
  public pubDate: Date;
  public categories: Array<string>;

  constructor(item: GoogleAppsScript.XML_Service.Element) {
    this.title = item.getChild('title').getText();
    this.url = item.getChild('link').getText();

    let split_url = this.url.split('/')
    this.isbn = split_url[split_url.length - 1];

    let pubDateText = item.getChild('pubDate').getText();
    this.pubDate = new Date(pubDateText);

    let categories = item.getChildren('category');
    this.categories = categories.map(category => category.getText());
  }

  toRow(createdDate: Date, lastUpdatedDate: Date): Array<string> {
    let pubDateISO = this.pubDate.toISOString();
    return [this.isbn, pubDateISO, this.title, this.categories.join(', '), this.url, createdDate.toISOString(), lastUpdatedDate.toISOString()]
  }

}

function parseXML(xml: string): BookList {
  let document = XmlService.parse(xml);
  return new BookList(document)
}

export { crawlingNewBooks, parseXML, BookList, BookInfo };
