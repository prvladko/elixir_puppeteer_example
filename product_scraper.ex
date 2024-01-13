defmodule ProductScraper do
  require Jason

  def scrape_products(search_query, max_results \\ 10) do
    {result, 0} = System.cmd("node", ["path/to/puppeteer_script.js", search_query, Integer.to_string(max_results)])

    case Jason.decode(result) do
      {:ok, %{"success" => true, "data" => data}} -> {:ok, data}
      {:ok, %{"success" => false, "error" => error}} -> {:error, error}
      {:error, _reason} -> {:error, "Failed to parse JSON response"}
    end
  end
end
