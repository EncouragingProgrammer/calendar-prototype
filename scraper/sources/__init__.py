"""List of sources the scraper runs. Add your new source module here."""
from scraper.sources import sample_news

SOURCES = [
    sample_news,
    # TODO (Sprint 2): add a real local source, e.g.  my_news_site,
]
