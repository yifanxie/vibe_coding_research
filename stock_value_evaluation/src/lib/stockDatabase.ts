export type Market = 'US' | 'EU' | 'UK' | 'CN' | 'HK';

export interface StockEntry {
  ticker: string;
  name: string;
  market: Market;
  sector?: string;
  industry?: string;
  searchKeywords: string[];
}

// Comprehensive stock database covering US, EU, UK, China, and HK markets
export const STOCK_DATABASE: StockEntry[] = [
  // US Market - S&P 500 & NASDAQ
  { ticker: 'AAPL', name: 'Apple Inc.', market: 'US', sector: 'Technology', industry: 'Consumer Electronics', searchKeywords: ['apple', 'iphone', 'mac', 'ipad'] },
  { ticker: 'MSFT', name: 'Microsoft Corporation', market: 'US', sector: 'Technology', industry: 'Software', searchKeywords: ['microsoft', 'windows', 'azure', 'office'] },
  { ticker: 'GOOGL', name: 'Alphabet Inc.', market: 'US', sector: 'Communication Services', industry: 'Internet Content', searchKeywords: ['google', 'alphabet', 'youtube', 'android'] },
  { ticker: 'GOOG', name: 'Alphabet Inc. Class C', market: 'US', sector: 'Communication Services', industry: 'Internet Content', searchKeywords: ['google', 'alphabet'] },
  { ticker: 'AMZN', name: 'Amazon.com Inc.', market: 'US', sector: 'Consumer Cyclical', industry: 'Internet Retail', searchKeywords: ['amazon', 'aws', 'prime', 'ecommerce'] },
  { ticker: 'NVDA', name: 'NVIDIA Corporation', market: 'US', sector: 'Technology', industry: 'Semiconductors', searchKeywords: ['nvidia', 'gpu', 'ai', 'graphics'] },
  { ticker: 'META', name: 'Meta Platforms Inc.', market: 'US', sector: 'Communication Services', industry: 'Internet Content', searchKeywords: ['meta', 'facebook', 'instagram', 'whatsapp'] },
  { ticker: 'TSLA', name: 'Tesla Inc.', market: 'US', sector: 'Consumer Cyclical', industry: 'Automobiles', searchKeywords: ['tesla', 'elon musk', 'electric vehicle', 'ev'] },
  { ticker: 'BRK-B', name: 'Berkshire Hathaway Inc.', market: 'US', sector: 'Financial Services', industry: 'Insurance', searchKeywords: ['berkshire', 'buffett', 'warren buffett'] },
  { ticker: 'JPM', name: 'JPMorgan Chase & Co.', market: 'US', sector: 'Financial Services', industry: 'Banks', searchKeywords: ['jpmorgan', 'chase', 'bank'] },
  { ticker: 'V', name: 'Visa Inc.', market: 'US', sector: 'Financial Services', industry: 'Credit Services', searchKeywords: ['visa', 'credit card', 'payment'] },
  { ticker: 'JNJ', name: 'Johnson & Johnson', market: 'US', sector: 'Healthcare', industry: 'Drug Manufacturers', searchKeywords: ['jnj', 'johnson', 'pharma'] },
  { ticker: 'UNH', name: 'UnitedHealth Group Inc.', market: 'US', sector: 'Healthcare', industry: 'Healthcare Plans', searchKeywords: ['unitedhealth', 'insurance', 'healthcare'] },
  { ticker: 'WMT', name: 'Walmart Inc.', market: 'US', sector: 'Consumer Defensive', industry: 'Retail', searchKeywords: ['walmart', 'retail', 'supermarket'] },
  { ticker: 'PG', name: 'Procter & Gamble Co.', market: 'US', sector: 'Consumer Defensive', industry: 'Household Products', searchKeywords: ['procter', 'gamble', 'pampers', 'tide'] },
  { ticker: 'MA', name: 'Mastercard Inc.', market: 'US', sector: 'Financial Services', industry: 'Credit Services', searchKeywords: ['mastercard', 'credit card', 'payment'] },
  { ticker: 'HD', name: 'Home Depot Inc.', market: 'US', sector: 'Consumer Cyclical', industry: 'Home Improvement', searchKeywords: ['home depot', 'hardware', 'home improvement'] },
  { ticker: 'BAC', name: 'Bank of America Corp.', market: 'US', sector: 'Financial Services', industry: 'Banks', searchKeywords: ['bofa', 'bank of america'] },
  { ticker: 'ABBV', name: 'AbbVie Inc.', market: 'US', sector: 'Healthcare', industry: 'Drug Manufacturers', searchKeywords: ['abbvie', 'pharma', 'humira'] },
  { ticker: 'PFE', name: 'Pfizer Inc.', market: 'US', sector: 'Healthcare', industry: 'Drug Manufacturers', searchKeywords: ['pfizer', 'vaccine', 'pharma'] },
  { ticker: 'KO', name: 'Coca-Cola Company', market: 'US', sector: 'Consumer Defensive', industry: 'Beverages', searchKeywords: ['coca cola', 'coke', 'beverage'] },
  { ticker: 'AVGO', name: 'Broadcom Inc.', market: 'US', sector: 'Technology', industry: 'Semiconductors', searchKeywords: ['broadcom', 'semiconductor', 'chip'] },
  { ticker: 'PEP', name: 'PepsiCo Inc.', market: 'US', sector: 'Consumer Defensive', industry: 'Beverages', searchKeywords: ['pepsi', 'frito lay', 'snacks'] },
  { ticker: 'LLY', name: 'Eli Lilly and Company', market: 'US', sector: 'Healthcare', industry: 'Drug Manufacturers', searchKeywords: ['eli lilly', 'lilly', 'pharma', 'diabetes'] },
  { ticker: 'TMO', name: 'Thermo Fisher Scientific', market: 'US', sector: 'Healthcare', industry: 'Medical Instruments', searchKeywords: ['thermo fisher', 'scientific', 'lab'] },
  { ticker: 'COST', name: 'Costco Wholesale Corp.', market: 'US', sector: 'Consumer Defensive', industry: 'Retail', searchKeywords: ['costco', 'wholesale', 'warehouse'] },
  { ticker: 'CSCO', name: 'Cisco Systems Inc.', market: 'US', sector: 'Technology', industry: 'Communication Equipment', searchKeywords: ['cisco', 'networking', 'router'] },
  { ticker: 'MCD', name: "McDonald's Corp.", market: 'US', sector: 'Consumer Cyclical', industry: 'Restaurants', searchKeywords: ['mcdonalds', 'fast food', 'restaurant'] },
  { ticker: 'NKE', name: 'Nike Inc.', market: 'US', sector: 'Consumer Cyclical', industry: 'Apparel', searchKeywords: ['nike', 'sneakers', 'sportswear'] },
  { ticker: 'XOM', name: 'Exxon Mobil Corp.', market: 'US', sector: 'Energy', industry: 'Oil & Gas', searchKeywords: ['exxon', 'mobil', 'oil', 'energy'] },
  { ticker: 'CVX', name: 'Chevron Corp.', market: 'US', sector: 'Energy', industry: 'Oil & Gas', searchKeywords: ['chevron', 'oil', 'energy'] },
  { ticker: 'AMD', name: 'Advanced Micro Devices', market: 'US', sector: 'Technology', industry: 'Semiconductors', searchKeywords: ['amd', 'ryzen', 'processor', 'cpu'] },
  { ticker: 'NFLX', name: 'Netflix Inc.', market: 'US', sector: 'Communication Services', industry: 'Entertainment', searchKeywords: ['netflix', 'streaming', 'video'] },
  { ticker: 'DIS', name: 'Walt Disney Company', market: 'US', sector: 'Communication Services', industry: 'Entertainment', searchKeywords: ['disney', 'pixar', 'marvel', 'streaming'] },
  { ticker: 'INTC', name: 'Intel Corporation', market: 'US', sector: 'Technology', industry: 'Semiconductors', searchKeywords: ['intel', 'processor', 'cpu'] },
  { ticker: 'CRM', name: 'Salesforce Inc.', market: 'US', sector: 'Technology', industry: 'Software', searchKeywords: ['salesforce', 'crm', 'cloud'] },
  { ticker: 'ADBE', name: 'Adobe Inc.', market: 'US', sector: 'Technology', industry: 'Software', searchKeywords: ['adobe', 'photoshop', 'creative'] },
  { ticker: 'PYPL', name: 'PayPal Holdings Inc.', market: 'US', sector: 'Financial Services', industry: 'Credit Services', searchKeywords: ['paypal', 'payment', 'venmo'] },
  { ticker: 'UBER', name: 'Uber Technologies Inc.', market: 'US', sector: 'Technology', industry: 'Software', searchKeywords: ['uber', 'ride', 'delivery'] },
  { ticker: 'ABNB', name: 'Airbnb Inc.', market: 'US', sector: 'Consumer Cyclical', industry: 'Travel', searchKeywords: ['airbnb', 'travel', 'vacation'] },
  { ticker: 'ZM', name: 'Zoom Video Communications', market: 'US', sector: 'Technology', industry: 'Software', searchKeywords: ['zoom', 'video', 'meeting'] },
  { ticker: 'SNOW', name: 'Snowflake Inc.', market: 'US', sector: 'Technology', industry: 'Software', searchKeywords: ['snowflake', 'data', 'cloud'] },
  { ticker: 'PLTR', name: 'Palantir Technologies', market: 'US', sector: 'Technology', industry: 'Software', searchKeywords: ['palantir', 'data', 'analytics'] },
  { ticker: 'COIN', name: 'Coinbase Global Inc.', market: 'US', sector: 'Financial Services', industry: 'Capital Markets', searchKeywords: ['coinbase', 'crypto', 'bitcoin'] },
  { ticker: 'SQ', name: 'Block Inc.', market: 'US', sector: 'Technology', industry: 'Software', searchKeywords: ['block', 'square', 'cash app'] },
  { ticker: 'SHOP', name: 'Shopify Inc.', market: 'US', sector: 'Technology', industry: 'Software', searchKeywords: ['shopify', 'ecommerce', 'store'] },
  { ticker: 'ROKU', name: 'Roku Inc.', market: 'US', sector: 'Communication Services', industry: 'Entertainment', searchKeywords: ['roku', 'streaming', 'tv'] },
  { ticker: 'DOCU', name: 'DocuSign Inc.', market: 'US', sector: 'Technology', industry: 'Software', searchKeywords: ['docusign', 'signature', 'document'] },
  { ticker: 'TWLO', name: 'Twilio Inc.', market: 'US', sector: 'Technology', industry: 'Software', searchKeywords: ['twilio', 'communication', 'sms'] },
  { ticker: 'DDOG', name: 'Datadog Inc.', market: 'US', sector: 'Technology', industry: 'Software', searchKeywords: ['datadog', 'monitoring', 'cloud'] },
  { ticker: 'NET', name: 'Cloudflare Inc.', market: 'US', sector: 'Technology', industry: 'Software', searchKeywords: ['cloudflare', 'cdn', 'security'] },
  { ticker: 'CRWD', name: 'CrowdStrike Holdings', market: 'US', sector: 'Technology', industry: 'Software', searchKeywords: ['crowdstrike', 'security', 'cyber'] },
  { ticker: 'OKTA', name: 'Okta Inc.', market: 'US', sector: 'Technology', industry: 'Software', searchKeywords: ['okta', 'identity', 'security'] },
  { ticker: 'ZS', name: 'Zscaler Inc.', market: 'US', sector: 'Technology', industry: 'Software', searchKeywords: ['zscaler', 'security', 'cloud'] },
  { ticker: 'FTNT', name: 'Fortinet Inc.', market: 'US', sector: 'Technology', industry: 'Software', searchKeywords: ['fortinet', 'firewall', 'security'] },
  { ticker: 'PANW', name: 'Palo Alto Networks', market: 'US', sector: 'Technology', industry: 'Software', searchKeywords: ['palo alto', 'security', 'firewall'] },
  { ticker: 'CYBR', name: 'CyberArk Software', market: 'US', sector: 'Technology', industry: 'Software', searchKeywords: ['cyberark', 'security', 'privileged'] },
  { ticker: 'SPLK', name: 'Splunk Inc.', market: 'US', sector: 'Technology', industry: 'Software', searchKeywords: ['splunk', 'data', 'analytics'] },
  { ticker: 'MDB', name: 'MongoDB Inc.', market: 'US', sector: 'Technology', industry: 'Software', searchKeywords: ['mongodb', 'database', 'nosql'] },
  { ticker: 'ESTC', name: 'Elastic N.V.', market: 'US', sector: 'Technology', industry: 'Software', searchKeywords: ['elastic', 'search', 'elasticsearch'] },

  // European Market - EURO STOXX 50 & DAX
  { ticker: 'SAP', name: 'SAP SE', market: 'EU', sector: 'Technology', industry: 'Software', searchKeywords: ['sap', 'germany', 'enterprise', 'erp'] },
  { ticker: 'ASML', name: 'ASML Holding N.V.', market: 'EU', sector: 'Technology', industry: 'Semiconductors', searchKeywords: ['asml', 'netherlands', 'lithography', 'chip'] },
  { ticker: 'MC.PA', name: 'LVMH Moët Hennessy', market: 'EU', sector: 'Consumer Cyclical', industry: 'Luxury Goods', searchKeywords: ['lvmh', 'france', 'luxury', 'louis vuitton'] },
  { ticker: 'TTE', name: 'TotalEnergies SE', market: 'EU', sector: 'Energy', industry: 'Oil & Gas', searchKeywords: ['total', 'france', 'oil', 'energy'] },
  { ticker: 'SIE.DE', name: 'Siemens AG', market: 'EU', sector: 'Industrials', industry: 'Industrial Conglomerates', searchKeywords: ['siemens', 'germany', 'industrial', 'automation'] },
  { ticker: 'AIR.PA', name: 'Airbus SE', market: 'EU', sector: 'Industrials', industry: 'Aerospace', searchKeywords: ['airbus', 'france', 'aircraft', 'aviation'] },
  { ticker: 'SAN', name: 'Sanofi S.A.', market: 'EU', sector: 'Healthcare', industry: 'Drug Manufacturers', searchKeywords: ['sanofi', 'france', 'pharma'] },
  { ticker: 'OR.PA', name: 'L\'Oréal S.A.', market: 'EU', sector: 'Consumer Defensive', industry: 'Personal Products', searchKeywords: ['loreal', 'france', 'cosmetics', 'beauty'] },
  { ticker: 'AI.PA', name: 'Air Liquide S.A.', market: 'EU', sector: 'Basic Materials', industry: 'Chemicals', searchKeywords: ['air liquide', 'france', 'gas', 'chemical'] },
  { ticker: 'BNP.PA', name: 'BNP Paribas S.A.', market: 'EU', sector: 'Financial Services', industry: 'Banks', searchKeywords: ['bnp', 'paribas', 'france', 'bank'] },
  { ticker: 'ADS.DE', name: 'adidas AG', market: 'EU', sector: 'Consumer Cyclical', industry: 'Apparel', searchKeywords: ['adidas', 'germany', 'sportswear', 'shoes'] },
  { ticker: 'BAS.DE', name: 'BASF SE', market: 'EU', sector: 'Basic Materials', industry: 'Chemicals', searchKeywords: ['basf', 'germany', 'chemical'] },
  { ticker: 'BAYN.DE', name: 'Bayer AG', market: 'EU', sector: 'Healthcare', industry: 'Drug Manufacturers', searchKeywords: ['bayer', 'germany', 'pharma'] },
  { ticker: 'DTE.DE', name: 'Deutsche Telekom AG', market: 'EU', sector: 'Communication Services', industry: 'Telecom', searchKeywords: ['telekom', 'germany', 't-mobile'] },
  { ticker: 'HEI.DE', name: 'Heidelberg Materials', market: 'EU', sector: 'Basic Materials', industry: 'Construction', searchKeywords: ['heidelberg', 'germany', 'cement'] },
  { ticker: 'IFX.DE', name: 'Infineon Technologies', market: 'EU', sector: 'Technology', industry: 'Semiconductors', searchKeywords: ['infineon', 'germany', 'chip', 'semiconductor'] },
  { ticker: 'MRK.DE', name: 'Merck KGaA', market: 'EU', sector: 'Healthcare', industry: 'Drug Manufacturers', searchKeywords: ['merck', 'germany', 'pharma'] },
  { ticker: 'MUV2.DE', name: 'Münchener Rück', market: 'EU', sector: 'Financial Services', industry: 'Insurance', searchKeywords: ['munich re', 'germany', 'insurance'] },
  { ticker: 'RWE.DE', name: 'RWE AG', market: 'EU', sector: 'Utilities', industry: 'Utilities', searchKeywords: ['rwe', 'germany', 'energy'] },
  { ticker: 'VOW3.DE', name: 'Volkswagen AG', market: 'EU', sector: 'Consumer Cyclical', industry: 'Automobiles', searchKeywords: ['vw', 'volkswagen', 'germany', 'car'] },
  { ticker: 'NESN.SW', name: 'Nestlé S.A.', market: 'EU', sector: 'Consumer Defensive', industry: 'Food Products', searchKeywords: ['nestle', 'switzerland', 'food', 'chocolate'] },
  { ticker: 'ROG.SW', name: 'Roche Holding AG', market: 'EU', sector: 'Healthcare', industry: 'Drug Manufacturers', searchKeywords: ['roche', 'switzerland', 'pharma'] },
  { ticker: 'NOVN.SW', name: 'Novartis AG', market: 'EU', sector: 'Healthcare', industry: 'Drug Manufacturers', searchKeywords: ['novartis', 'switzerland', 'pharma'] },
  { ticker: 'UBSG.SW', name: 'UBS Group AG', market: 'EU', sector: 'Financial Services', industry: 'Banks', searchKeywords: ['ubs', 'switzerland', 'bank'] },
  { ticker: 'CSGN.SW', name: 'Credit Suisse Group', market: 'EU', sector: 'Financial Services', industry: 'Banks', searchKeywords: ['credit suisse', 'switzerland', 'bank'] },
  { ticker: 'ZURN.SW', name: 'Zurich Insurance', market: 'EU', sector: 'Financial Services', industry: 'Insurance', searchKeywords: ['zurich', 'switzerland', 'insurance'] },
  { ticker: 'ABBN.SW', name: 'ABB Ltd', market: 'EU', sector: 'Industrials', industry: 'Industrial Conglomerates', searchKeywords: ['abb', 'switzerland', 'automation'] },
  { ticker: 'SREN.SW', name: 'Swiss Re AG', market: 'EU', sector: 'Financial Services', industry: 'Insurance', searchKeywords: ['swiss re', 'switzerland', 'insurance'] },
  { ticker: 'GIVN.SW', name: 'Givaudan S.A.', market: 'EU', sector: 'Basic Materials', industry: 'Chemicals', searchKeywords: ['givaudan', 'switzerland', 'fragrance'] },
  { ticker: 'SGSN.SW', name: 'SGS S.A.', market: 'EU', sector: 'Industrials', industry: 'Inspection', searchKeywords: ['sgs', 'switzerland', 'testing'] },

  // UK Market - FTSE 100
  { ticker: 'SHEL', name: 'Shell plc', market: 'UK', sector: 'Energy', industry: 'Oil & Gas', searchKeywords: ['shell', 'uk', 'oil', 'energy'] },
  { ticker: 'AZN', name: 'AstraZeneca PLC', market: 'UK', sector: 'Healthcare', industry: 'Drug Manufacturers', searchKeywords: ['astrazeneca', 'uk', 'pharma', 'vaccine'] },
  { ticker: 'UL', name: 'Unilever PLC', market: 'UK', sector: 'Consumer Defensive', industry: 'Household Products', searchKeywords: ['unilever', 'uk', 'dove', 'axe'] },
  { ticker: 'HSBC', name: 'HSBC Holdings plc', market: 'UK', sector: 'Financial Services', industry: 'Banks', searchKeywords: ['hsbc', 'uk', 'bank', 'hongkong'] },
  { ticker: 'RIO', name: 'Rio Tinto Group', market: 'UK', sector: 'Basic Materials', industry: 'Mining', searchKeywords: ['rio tinto', 'uk', 'mining', 'iron'] },
  { ticker: 'BP', name: 'BP p.l.c.', market: 'UK', sector: 'Energy', industry: 'Oil & Gas', searchKeywords: ['bp', 'british petroleum', 'uk', 'oil'] },
  { ticker: 'DGE', name: 'Diageo plc', market: 'UK', sector: 'Consumer Defensive', industry: 'Beverages', searchKeywords: ['diageo', 'uk', 'alcohol', 'johnnie walker'] },
  { ticker: 'BARC', name: 'Barclays PLC', market: 'UK', sector: 'Financial Services', industry: 'Banks', searchKeywords: ['barclays', 'uk', 'bank'] },
  { ticker: 'LSEG', name: 'London Stock Exchange', market: 'UK', sector: 'Financial Services', industry: 'Capital Markets', searchKeywords: ['lse', 'london', 'exchange', 'refinitiv'] },
  { ticker: 'RELX', name: 'RELX PLC', market: 'UK', sector: 'Industrials', industry: 'Publishing', searchKeywords: ['relx', 'uk', 'publishing', 'scientific'] },
  { ticker: 'VOD', name: 'Vodafone Group Plc', market: 'UK', sector: 'Communication Services', industry: 'Telecom', searchKeywords: ['vodafone', 'uk', 'telecom', 'mobile'] },
  { ticker: 'GLEN', name: 'Glencore plc', market: 'UK', sector: 'Basic Materials', industry: 'Mining', searchKeywords: ['glencore', 'uk', 'mining', 'commodities'] },
  { ticker: 'BATS', name: 'British American Tobacco', market: 'UK', sector: 'Consumer Defensive', industry: 'Tobacco', searchKeywords: ['bat', 'uk', 'cigarette', 'lucky strike'] },
  { ticker: 'NG', name: 'National Grid plc', market: 'UK', sector: 'Utilities', industry: 'Utilities', searchKeywords: ['national grid', 'uk', 'electricity'] },
  { ticker: 'LLOY', name: 'Lloyds Banking Group', market: 'UK', sector: 'Financial Services', industry: 'Banks', searchKeywords: ['lloyds', 'uk', 'bank', 'halifax'] },
  { ticker: 'PRU', name: 'Prudential plc', market: 'UK', sector: 'Financial Services', industry: 'Insurance', searchKeywords: ['prudential', 'uk', 'insurance', 'asia'] },
  { ticker: 'EXPN', name: 'Experian plc', market: 'UK', sector: 'Industrials', industry: 'Business Services', searchKeywords: ['experian', 'uk', 'credit', 'data'] },
  { ticker: 'CPG', name: 'Compass Group PLC', market: 'UK', sector: 'Consumer Cyclical', industry: 'Food Services', searchKeywords: ['compass', 'uk', 'catering', 'food'] },
  { ticker: 'SSE', name: 'SSE plc', market: 'UK', sector: 'Utilities', industry: 'Utilities', searchKeywords: ['sse', 'uk', 'energy', 'renewable'] },
  { ticker: 'AAL', name: 'Anglo American plc', market: 'UK', sector: 'Basic Materials', industry: 'Mining', searchKeywords: ['anglo american', 'uk', 'mining', 'diamond'] },
  { ticker: 'ITRK', name: 'Intertek Group plc', market: 'UK', sector: 'Industrials', industry: 'Inspection', searchKeywords: ['intertek', 'uk', 'testing', 'certification'] },
  { ticker: 'ANTO', name: 'Antofagasta plc', market: 'UK', sector: 'Basic Materials', industry: 'Mining', searchKeywords: ['antofagasta', 'uk', 'copper', 'chile'] },
  { ticker: 'IMB', name: 'Imperial Brands PLC', market: 'UK', sector: 'Consumer Defensive', industry: 'Tobacco', searchKeywords: ['imperial', 'uk', 'cigarette'] },
  { ticker: 'SN', name: 'Smith & Nephew plc', market: 'UK', sector: 'Healthcare', industry: 'Medical Devices', searchKeywords: ['smith nephew', 'uk', 'medical'] },
  { ticker: 'SMT', name: 'Scottish Mortgage', market: 'UK', sector: 'Financial Services', industry: 'Asset Management', searchKeywords: ['scottish mortgage', 'uk', 'investment trust'] },
  { ticker: 'JD', name: 'JD Sports Fashion plc', market: 'UK', sector: 'Consumer Cyclical', industry: 'Retail', searchKeywords: ['jd sports', 'uk', 'retail', 'sneakers'] },
  { ticker: 'ABF', name: 'Associated British Foods', market: 'UK', sector: 'Consumer Defensive', industry: 'Food Products', searchKeywords: ['abf', 'uk', 'primark', 'sugar'] },
  { ticker: 'WPP', name: 'WPP plc', market: 'UK', sector: 'Communication Services', industry: 'Advertising', searchKeywords: ['wpp', 'uk', 'advertising', 'media'] },
  { ticker: 'INF', name: 'Informa plc', market: 'UK', sector: 'Industrials', industry: 'Events', searchKeywords: ['informa', 'uk', 'events', 'publishing'] },
  { ticker: 'FRES', name: 'Fresnillo plc', market: 'UK', sector: 'Basic Materials', industry: 'Mining', searchKeywords: ['fresnillo', 'uk', 'silver', 'mexico'] },

  // China Market - CSI 300 & Hang Seng
  { ticker: '0700.HK', name: 'Tencent Holdings Ltd', market: 'CN', sector: 'Communication Services', industry: 'Internet Content', searchKeywords: ['tencent', 'china', 'wechat', 'gaming'] },
  { ticker: 'BABA', name: 'Alibaba Group Holding', market: 'CN', sector: 'Consumer Cyclical', industry: 'Internet Retail', searchKeywords: ['alibaba', 'china', 'taobao', 'tmall'] },
  { ticker: '3690.HK', name: 'Meituan', market: 'CN', sector: 'Consumer Cyclical', industry: 'Internet Services', searchKeywords: ['meituan', 'china', 'delivery', 'food'] },
  { ticker: '2318.HK', name: 'Ping An Insurance', market: 'CN', sector: 'Financial Services', industry: 'Insurance', searchKeywords: ['ping an', 'china', 'insurance'] },
  { ticker: '600519.SS', name: 'Kweichow Moutai', market: 'CN', sector: 'Consumer Defensive', industry: 'Beverages', searchKeywords: ['moutai', 'china', 'alcohol', 'baijiu'] },
  { ticker: '601398.SS', name: 'Industrial & Commercial Bank', market: 'CN', sector: 'Financial Services', industry: 'Banks', searchKeywords: ['icbc', 'china', 'bank'] },
  { ticker: '601857.SS', name: 'PetroChina Company', market: 'CN', sector: 'Energy', industry: 'Oil & Gas', searchKeywords: ['petrochina', 'china', 'oil'] },
  { ticker: '601288.SS', name: 'Agricultural Bank of China', market: 'CN', sector: 'Financial Services', industry: 'Banks', searchKeywords: ['abc', 'china', 'bank'] },
  { ticker: '601988.SS', name: 'Bank of China Ltd', market: 'CN', sector: 'Financial Services', industry: 'Banks', searchKeywords: ['bank of china', 'boc', 'china'] },
  { ticker: '601628.SS', name: 'China Life Insurance', market: 'CN', sector: 'Financial Services', industry: 'Insurance', searchKeywords: ['china life', 'insurance'] },
  { ticker: '600036.SS', name: 'China Merchants Bank', market: 'CN', sector: 'Financial Services', industry: 'Banks', searchKeywords: ['cmb', 'china', 'bank'] },
  { ticker: '601088.SS', name: 'China Shenhua Energy', market: 'CN', sector: 'Energy', industry: 'Coal', searchKeywords: ['shenhua', 'china', 'coal', 'energy'] },
  { ticker: '601318.SS', name: 'Ping An Bank', market: 'CN', sector: 'Financial Services', industry: 'Banks', searchKeywords: ['ping an bank', 'china'] },
  { ticker: '002415.SZ', name: 'Hangzhou Hikvision', market: 'CN', sector: 'Technology', industry: 'Electronic Equipment', searchKeywords: ['hikvision', 'china', 'camera', 'security'] },
  { ticker: '300750.SZ', name: 'CATL', market: 'CN', sector: 'Consumer Cyclical', industry: 'Auto Components', searchKeywords: ['catl', 'china', 'battery', 'ev'] },
  { ticker: '002594.SZ', name: 'BYD Company Ltd', market: 'CN', sector: 'Consumer Cyclical', industry: 'Automobiles', searchKeywords: ['byd', 'china', 'electric car', 'ev'] },
  { ticker: '601012.SS', name: 'LONGi Green Energy', market: 'CN', sector: 'Technology', industry: 'Solar', searchKeywords: ['longi', 'china', 'solar', 'renewable'] },
  { ticker: '688981.SS', name: 'SMIC', market: 'CN', sector: 'Technology', industry: 'Semiconductors', searchKeywords: ['smic', 'china', 'chip', 'semiconductor'] },
  { ticker: '603259.SS', name: 'WuXi AppTec', market: 'CN', sector: 'Healthcare', industry: 'Life Sciences', searchKeywords: ['wuxi', 'china', 'pharma', 'cro'] },
  { ticker: '300760.SZ', name: 'Mindray Medical', market: 'CN', sector: 'Healthcare', industry: 'Medical Devices', searchKeywords: ['mindray', 'china', 'medical'] },
  { ticker: '002230.SZ', name: 'iFLYTEK', market: 'CN', sector: 'Technology', industry: 'Software', searchKeywords: ['iflytek', 'china', 'ai', 'voice'] },
  { ticker: '600276.SS', name: 'Jiangsu Hengrui Medicine', market: 'CN', sector: 'Healthcare', industry: 'Drug Manufacturers', searchKeywords: ['hengrui', 'china', 'pharma'] },
  { ticker: '300122.SZ', name: 'Chongqing Zhifei', market: 'CN', sector: 'Healthcare', industry: 'Biotechnology', searchKeywords: ['zhifei', 'china', 'vaccine'] },
  { ticker: '002812.SZ', name: 'Yunnan Energy', market: 'CN', sector: 'Consumer Cyclical', industry: 'Auto Components', searchKeywords: ['yunnan energy', 'china', 'battery'] },
  { ticker: '603288.SS', name: 'Foshan Haitian', market: 'CN', sector: 'Consumer Defensive', industry: 'Food Products', searchKeywords: ['haitian', 'china', 'soy sauce'] },
  { ticker: '000858.SZ', name: 'Wuliangye Yibin', market: 'CN', sector: 'Consumer Defensive', industry: 'Beverages', searchKeywords: ['wuliangye', 'china', 'alcohol'] },
  { ticker: '002352.SZ', name: 'S.F. Holding', market: 'CN', sector: 'Industrials', industry: 'Logistics', searchKeywords: ['sf express', 'china', 'delivery', 'logistics'] },
  { ticker: '601888.SS', name: 'China Tourism Group', market: 'CN', sector: 'Consumer Cyclical', industry: 'Retail', searchKeywords: ['china tourism', 'duty free', 'china'] },
  { ticker: '600009.SS', name: 'Shanghai Airport', market: 'CN', sector: 'Industrials', industry: 'Airports', searchKeywords: ['shanghai airport', 'china'] },
  { ticker: '002142.SZ', name: 'Bank of Ningbo', market: 'CN', sector: 'Financial Services', industry: 'Banks', searchKeywords: ['ningbo bank', 'china'] },
  { ticker: '600030.SS', name: 'CITIC Securities', market: 'CN', sector: 'Financial Services', industry: 'Capital Markets', searchKeywords: ['citic', 'china', 'broker'] },
  { ticker: '300014.SZ', name: 'EVE Energy', market: 'CN', sector: 'Consumer Cyclical', industry: 'Auto Components', searchKeywords: ['eve', 'china', 'battery'] },
  { ticker: '002049.SZ', name: 'UNISOC', market: 'CN', sector: 'Technology', industry: 'Semiconductors', searchKeywords: ['unisoc', 'china', 'chip'] },
  { ticker: '688111.SS', name: 'Kingsoft Office', market: 'CN', sector: 'Technology', industry: 'Software', searchKeywords: ['kingsoft', 'china', 'wps', 'office'] },
  { ticker: '603501.SS', name: 'Will Semiconductor', market: 'CN', sector: 'Technology', industry: 'Semiconductors', searchKeywords: ['willsemi', 'china', 'chip'] },

  // Hong Kong Market - Hang Seng Index
  { ticker: '0005.HK', name: 'HSBC Holdings plc', market: 'HK', sector: 'Financial Services', industry: 'Banks', searchKeywords: ['hsbc', 'hong kong', 'bank'] },
  { ticker: '1299.HK', name: 'AIA Group Ltd', market: 'HK', sector: 'Financial Services', industry: 'Insurance', searchKeywords: ['aia', 'hong kong', 'insurance', 'asia'] },
  { ticker: '0939.HK', name: 'China Construction Bank', market: 'HK', sector: 'Financial Services', industry: 'Banks', searchKeywords: ['ccb', 'china construction bank', 'hong kong'] },
  { ticker: '1398.HK', name: 'Industrial & Commercial Bank', market: 'HK', sector: 'Financial Services', industry: 'Banks', searchKeywords: ['icbc', 'hong kong', 'bank'] },
  { ticker: '3988.HK', name: 'Bank of China Ltd', market: 'HK', sector: 'Financial Services', industry: 'Banks', searchKeywords: ['bank of china', 'hong kong', 'boc'] },
  { ticker: '2318.HK', name: 'Ping An Insurance', market: 'HK', sector: 'Financial Services', industry: 'Insurance', searchKeywords: ['ping an', 'hong kong', 'insurance'] },
  { ticker: '0883.HK', name: 'CNOOC Limited', market: 'HK', sector: 'Energy', industry: 'Oil & Gas', searchKeywords: ['cnooc', 'hong kong', 'oil', 'china'] },
  { ticker: '0386.HK', name: 'China Petroleum & Chemical', market: 'HK', sector: 'Energy', industry: 'Oil & Gas', searchKeywords: ['sinopec', 'hong kong', 'oil'] },
  { ticker: '0857.HK', name: 'PetroChina Company', market: 'HK', sector: 'Energy', industry: 'Oil & Gas', searchKeywords: ['petrochina', 'hong kong', 'oil'] },
  { ticker: '2628.HK', name: 'China Life Insurance', market: 'HK', sector: 'Financial Services', industry: 'Insurance', searchKeywords: ['china life', 'hong kong', 'insurance'] },
  { ticker: '3968.HK', name: 'China Merchants Bank', market: 'HK', sector: 'Financial Services', industry: 'Banks', searchKeywords: ['cmb', 'hong kong', 'bank'] },
  { ticker: '1288.HK', name: 'Agricultural Bank of China', market: 'HK', sector: 'Financial Services', industry: 'Banks', searchKeywords: ['abc', 'hong kong', 'bank'] },
  { ticker: '0998.HK', name: 'China CITIC Bank', market: 'HK', sector: 'Financial Services', industry: 'Banks', searchKeywords: ['citic bank', 'hong kong'] },
  { ticker: '0688.HK', name: 'China Overseas Land', market: 'HK', sector: 'Real Estate', industry: 'Real Estate', searchKeywords: ['coli', 'hong kong', 'property'] },
  { ticker: '1109.HK', name: 'China Resources Land', market: 'HK', sector: 'Real Estate', industry: 'Real Estate', searchKeywords: ['china resources', 'hong kong', 'property'] },
  { ticker: '0001.HK', name: 'CK Hutchison Holdings', market: 'HK', sector: 'Industrials', industry: 'Conglomerate', searchKeywords: ['ck hutchison', 'hong kong', 'li ka shing'] },
  { ticker: '0002.HK', name: 'CLP Holdings Ltd', market: 'HK', sector: 'Utilities', industry: 'Utilities', searchKeywords: ['clp', 'hong kong', 'electricity'] },
  { ticker: '0003.HK', name: 'Hong Kong & China Gas', market: 'HK', sector: 'Utilities', industry: 'Gas Utilities', searchKeywords: ['towngas', 'hong kong', 'gas'] },
  { ticker: '0006.HK', name: 'Power Assets Holdings', market: 'HK', sector: 'Utilities', industry: 'Utilities', searchKeywords: ['power assets', 'hong kong', 'electricity'] },
  { ticker: '1038.HK', name: 'CK Infrastructure', market: 'HK', sector: 'Utilities', industry: 'Utilities', searchKeywords: ['cki', 'hong kong', 'infrastructure'] },
  { ticker: '0016.HK', name: 'Sun Hung Kai Properties', market: 'HK', sector: 'Real Estate', industry: 'Real Estate', searchKeywords: ['shkp', 'hong kong', 'property'] },
  { ticker: '0017.HK', name: 'New World Development', market: 'HK', sector: 'Real Estate', industry: 'Real Estate', searchKeywords: ['new world', 'hong kong', 'property'] },
  { ticker: '0083.HK', name: 'Sino Land Company', market: 'HK', sector: 'Real Estate', industry: 'Real Estate', searchKeywords: ['sino land', 'hong kong', 'property'] },
  { ticker: '1019.HK', name: 'Alibaba Health', market: 'HK', sector: 'Healthcare', industry: 'Pharmaceutical Retail', searchKeywords: ['alibaba health', 'hong kong'] },
  { ticker: '0522.HK', name: 'ASMPT Limited', market: 'HK', sector: 'Technology', industry: 'Semiconductor Equipment', searchKeywords: ['asmpt', 'hong kong', 'semiconductor'] },
  { ticker: '2382.HK', name: 'Sunny Optical', market: 'HK', sector: 'Technology', industry: 'Electronic Components', searchKeywords: ['sunny optical', 'hong kong', 'camera'] },
  { ticker: '2015.HK', name: 'Li Ning Company', market: 'HK', sector: 'Consumer Cyclical', industry: 'Apparel', searchKeywords: ['li ning', 'hong kong', 'sportswear'] },
  { ticker: '2020.HK', name: 'ANTA Sports Products', market: 'HK', sector: 'Consumer Cyclical', industry: 'Apparel', searchKeywords: ['anta', 'hong kong', 'sportswear'] },
  { ticker: '9618.HK', name: 'JD.com Inc.', market: 'HK', sector: 'Consumer Cyclical', industry: 'Internet Retail', searchKeywords: ['jd', 'hong kong', 'ecommerce'] },
  { ticker: '9999.HK', name: 'NetEase Inc.', market: 'HK', sector: 'Communication Services', industry: 'Gaming', searchKeywords: ['netease', 'hong kong', 'gaming'] },
  { ticker: '9866.HK', name: 'NIO Inc.', market: 'HK', sector: 'Consumer Cyclical', industry: 'Automobiles', searchKeywords: ['nio', 'hong kong', 'electric car', 'ev'] },
  { ticker: '9868.HK', name: 'Li Auto Inc.', market: 'HK', sector: 'Consumer Cyclical', industry: 'Automobiles', searchKeywords: ['li auto', 'hong kong', 'electric car', 'ev'] },
  { ticker: '1211.HK', name: 'BYD Company Ltd', market: 'HK', sector: 'Consumer Cyclical', industry: 'Automobiles', searchKeywords: ['byd', 'hong kong', 'electric car'] },
  { ticker: '2333.HK', name: 'Great Wall Motor', market: 'HK', sector: 'Consumer Cyclical', industry: 'Automobiles', searchKeywords: ['great wall', 'hong kong', 'car'] },
  { ticker: '0175.HK', name: 'Geely Automobile', market: 'HK', sector: 'Consumer Cyclical', industry: 'Automobiles', searchKeywords: ['geely', 'hong kong', 'car'] },
  { ticker: '1928.HK', name: 'Sands China Ltd', market: 'HK', sector: 'Consumer Cyclical', industry: 'Resorts & Casinos', searchKeywords: ['sands', 'hong kong', 'casino', 'macau'] },
  { ticker: '0880.HK', name: 'SJM Holdings', market: 'HK', sector: 'Consumer Cyclical', industry: 'Resorts & Casinos', searchKeywords: ['sjm', 'hong kong', 'casino', 'macau'] },
  { ticker: '1128.HK', name: 'Wynn Macau Ltd', market: 'HK', sector: 'Consumer Cyclical', industry: 'Resorts & Casinos', searchKeywords: ['wynn', 'hong kong', 'casino', 'macau'] },
  { ticker: '1929.HK', name: 'Chow Tai Fook', market: 'HK', sector: 'Consumer Cyclical', industry: 'Retail', searchKeywords: ['chow tai fook', 'hong kong', 'jewelry'] },
  { ticker: '2319.HK', name: 'China Mengniu Dairy', market: 'HK', sector: 'Consumer Defensive', industry: 'Food Products', searchKeywords: ['mengniu', 'hong kong', 'dairy'] },
  { ticker: '0291.HK', name: 'China Resources Beer', market: 'HK', sector: 'Consumer Defensive', industry: 'Beverages', searchKeywords: ['china resources beer', 'hong kong', 'snow'] },
  { ticker: '1876.HK', name: 'Budweiser APAC', market: 'HK', sector: 'Consumer Defensive', industry: 'Beverages', searchKeywords: ['budweiser', 'hong kong', 'beer'] },
];

// Market display names
export const MARKET_NAMES: Record<Market, string> = {
  'US': 'United States',
  'EU': 'Europe',
  'UK': 'United Kingdom',
  'CN': 'China (A-Share)',
  'HK': 'Hong Kong',
};

// Market flags/icons
export const MARKET_FLAGS: Record<Market, string> = {
  'US': '🇺🇸',
  'EU': '🇪🇺',
  'UK': '🇬🇧',
  'CN': '🇨🇳',
  'HK': '🇭🇰',
};

/**
 * Search stocks by ticker or company name
 * Returns matches sorted by relevance
 */
export function searchStocks(query: string): StockEntry[] {
  if (!query || query.length < 1) return [];
  
  const normalizedQuery = query.toLowerCase().trim();
  const results: { stock: StockEntry; score: number }[] = [];
  
  for (const stock of STOCK_DATABASE) {
    let score = 0;
    const tickerLower = stock.ticker.toLowerCase();
    const nameLower = stock.name.toLowerCase();
    
    // Exact ticker match (highest priority)
    if (tickerLower === normalizedQuery) {
      score = 100;
    }
    // Ticker starts with query
    else if (tickerLower.startsWith(normalizedQuery)) {
      score = 80;
    }
    // Ticker contains query
    else if (tickerLower.includes(normalizedQuery)) {
      score = 60;
    }
    // Exact name match
    else if (nameLower === normalizedQuery) {
      score = 90;
    }
    // Name starts with query
    else if (nameLower.startsWith(normalizedQuery)) {
      score = 70;
    }
    // Name contains query
    else if (nameLower.includes(normalizedQuery)) {
      score = 50;
    }
    // Keyword match
    else if (stock.searchKeywords.some(kw => kw.includes(normalizedQuery))) {
      score = 40;
    }
    
    if (score > 0) {
      results.push({ stock, score });
    }
  }
  
  // Sort by score descending
  return results
    .sort((a, b) => b.score - a.score)
    .map(r => r.stock);
}

/**
 * Get stock by exact ticker
 */
export function getStockByTicker(ticker: string): StockEntry | undefined {
  return STOCK_DATABASE.find(s => s.ticker.toUpperCase() === ticker.toUpperCase());
}

/**
 * Get all stocks by market
 */
export function getStocksByMarket(market: Market): StockEntry[] {
  return STOCK_DATABASE.filter(s => s.market === market);
}

/**
 * Get sector peers for a stock
 */
export function getSectorPeers(ticker: string, limit: number = 5): StockEntry[] {
  const stock = getStockByTicker(ticker);
  if (!stock) return [];
  
  return STOCK_DATABASE
    .filter(s => s.sector === stock.sector && s.ticker !== ticker)
    .slice(0, limit);
}
