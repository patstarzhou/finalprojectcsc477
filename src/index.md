---
toc: false
---

<div class="hero">
  <h1 style="color: #FFFFFF;">Get Vaccinated.</h1>
  <p class="hero-sub"><div>A scrolling narrative on how vaccines changed disease outcomes in the United States.</div></p>
</div>

## Introduction

<section class="panel">
  <div>
    Before modern medicine, diseases terrorized human populations all over the world. Outbreaks of
    measles and polio killed thousands yearly. The development and widespread adoption of vaccines
    almost, if not completely, eradicated these former killers. For our project, we wanted to visualize
    the impact of polio, measles, and COVID-19 in the US, and the role that modern vaccinations have
    played in stopping the spread of these diseases that have killed millions throughout human history.
  </div>
</section>

## Polio

<section class="viz-panel">
  <iframe class="viz-frame viz-polio" src="polio-scroll" title="Polio in the United States" loading="lazy"></iframe>
</section>

## Measles

<section class="viz-panel">
  <iframe class="viz-frame viz-measles" src="measles-scroll" title="Measles in the United States" loading="lazy"></iframe>
</section>

## COVID-19

<section class="viz-panel">
  <iframe class="viz-frame viz-covid" src="covid-scroll" title="COVID-19 in the United States" loading="lazy"></iframe>
</section>

## Conclusion

<section class="panel">
  <div>
    Across all three timelines, the pattern is consistent in that once vaccination becomes widespread,
    deaths decline. The data reinforces one message, and it is that vaccination saves lives.
  </div>
</section>

## Data Sources

<section class="panel sources">
  <p><strong>Polio:</strong>
    <div>Public Health Reports (1942); United States Census Bureau (1945); Centers for Disease Control and Prevention (2023) – processed by <a href="https://ourworldindata.org/grapher/reported-paralytic-polio-cases-and-deaths-in-the-united-states-since-1910">Our World in Data</a></div>
    <br>
    <div>Public Health Reports (1942); Centers for Disease Control and Prevention (2023) – processed by <a href="https://ourworldindata.org/grapher/reported-paralytic-polio-cases-and-deaths-in-the-united-states-since-1910">Our World in Data</a></div>
  </p>
  <p><strong>Measles:</strong> 
    <div>Public Health Reports; US Census Bureau; Centers for Disease Control and Prevention (1994); Centers for Disease Control and Prevention (CDC) (2026) – processed by <a href="https://ourworldindata.org/grapher/measles-cases-and-death">Our World in Data</a></div>
    <br>
    <div>Public Health Reports (1942); US Census Bureau (1952); WHO Mortality Database (2025) – processed by <a href="https://ourworldindata.org/grapher/measles-cases-and-death">Our World in Data</a></div>
  </p>
  <p><strong>COVID-19:</strong>
  <div>“Covid-19 Data | Who Covid-19 Dashboard.” World Health Organization, World Health Organization, data.who.int/dashboards/covid19/data. <a href="https://srhdpeuwpubsa.blob.core.windows.net/whdh/COVID/WHO-COVID-19-global-daily-data.csv">Daily frequency reporting of new COVID-19 cases and deaths by date reported to WHO </a>, aggregated to weekly counts in this project.</div> </p>
</section>

<style>
.hero {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  margin: 2.5rem 0 2rem;
  text-align: center;
}

.hero h1 {
  margin: 0;
  font-family: var(--sans-serif);
  font-size: clamp(2.4rem, 6vw, 4.8rem);
  font-weight: 850;
  letter-spacing: 0.01em;
  line-height: 1;
}

.hero-sub {
  margin: 0.8rem 0 0;
  max-width: 62ch;
  font-family: var(--sans-serif);
  color: #ffffff;
  font-size: 1.02rem;
  line-height: 1.55;
}

.panel {
  max-width: 880px;
  margin: 0 auto 2.4rem;
  padding: 1.5rem 1.25rem 1.75rem;
  background: transparent;
  border: 0;
  border-radius: 0;
  box-shadow: none;
}

.section-lead {
  max-width: 880px;
  margin: 0.2rem auto 0.85rem;
  font-family: var(--sans-serif);
  color: #ffffff;
}

.panel p {
  margin: 0;
  font-family: var(--sans-serif);
  font-size: 1.04rem;
  line-height: 1.75;
  color: #ffffff;
}

h2 {
  color: #ffffff;
}

.viz-panel {
  max-width: 1000px;
  margin: 0 auto 2.8rem;
  border: 1px solid #dbe3f3;
  border-radius: 14px;
  overflow: hidden;
  box-shadow: 0 10px 28px rgba(15, 23, 42, 0.11);
  background: #fff;
}

.viz-frame {
  display: block;
  width: 100%;
  border: 0;
}

.viz-polio {
  height: 2150px;
}

.viz-measles {
  height: 2200px;
}

.viz-covid {
  height: 2350px;
}

.sources p + p {
  margin-top: 0.9rem;
}

@media (max-width: 640px) {
  .panel {
    padding: 1.1rem 1rem 1.3rem;
  }

  .viz-polio {
    height: 1450px;
  }

  .viz-measles {
    height: 1500px;
  }

  .viz-covid {
    height: 1600px;
  }
}

@media (min-width: 641px) and (max-width: 1024px) {
  .viz-polio {
    height: 1800px;
  }

  .viz-measles {
    height: 1850px;
  }

  .viz-covid {
    height: 1950px;
  }
}
</style>
