function crawlingNewBooks() {
  var url = "https://www.hanmoto.com/ci/bd/search/hdt/%E6%96%B0%E3%81%97%E3%81%8F%E7%99%BB%E9%8C%B2%E3%81%95%E3%82%8C%E3%81%9F%E6%9C%AC/sdate/today/created/today/order/desc/vw/rss20"


  let xml = UrlFetchApp.fetch(url).getContentText();

  let document = XmlService.parse(xml);

  let root = document.getRootElement();

  let channel = root.getChild('channel');
  let listPubDateText = channel.getChild('pubDate').getText();
  let listPubDateISO = new Date(listPubDateText).toISOString();
  let listUpdateDateText = channel.getChild('lastBuildDate').getText();
  let listUpdateDateISO = new Date(listUpdateDateText).toISOString();

  let items = channel.getChildren('item');

  let pubDateJST = new Date(listPubDateText).toLocaleDateString('japanese', { year: 'numeric', month: 'long', day: 'numeric' });
  let activeSpreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  let todaysSheet = activeSpreadsheet.getSheetByName(pubDateJST);
  if (todaysSheet != null) {
    activeSpreadsheet.deleteSheet(todaysSheet);
  }
  todaysSheet = activeSpreadsheet.insertSheet(pubDateJST);
  todaysSheet.appendRow(['ISBN', '出版予定日', 'タイトル・著者・出版社', 'カテゴリー', 'Hanmoto URL', 'リスト作成日時', '最終更新日時']);

  items.forEach(item => {

    let title = item.getChild('title').getText();
    let url = item.getChild('link').getText();
    let split_url = url.split('/')
    let isbn = split_url[split_url.length - 1];

    let pubDateText = item.getChild('pubDate').getText();
    let pubDate = new Date(pubDateText);
    //let pubDateTextJST = pubDate.toLocaleDateString({ timeZone: 'Asia/Tokyo' }, options);
    let pubDateISO = pubDate.toISOString();

    let categories = item.getChildren('category');
    let labels = categories.map(category => category.getText()).join(', ');

    // ISBN, PublishDate, Title+Authors, Category, URL
    todaysSheet!.appendRow([isbn, pubDateISO, title, labels, url, listPubDateISO, listUpdateDateISO]);
  });
}

export { crawlingNewBooks };
