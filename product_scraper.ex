defmodule ProductScraper do
  use Task.Supervisor
  require Jason
  require Logger

  @default_max_retries 3
  @retry_delay_ms 2000
  @default_parallel_tasks 50

  def start_link(_arg) do
    Task.Supervisor.start_link(name: __MODULE__)
  end

  def scrape_products(search_queries, max_results \\ 10) do
    Logger.info("Initiating parallel scraping")

    search_queries
    |> Enum.chunk_every(@default_parallel_tasks)
    |> Enum.each(fn chunk ->
      chunk
      |> Enum.map(&start_scrape_task(&1, max_results))
      |> Enum.each(fn task -> await_task(task) end)
    end)
  end

  defp start_scrape_task(search_query, max_results) do
    Task.Supervisor.async(__MODULE__, fn ->
      scrape_single_product(search_query, max_results)
    end)
  end

  defp await_task(task) do
    task
    |> Task.await(:infinity)
    |> handle_scrape_result()
  end

  defp handle_scrape_result({:ok, data}) do
    Logger.info("Successfully scraped data")
    {:ok, data}
  end
  defp handle_scrape_result({:error, reason}) do
    Logger.error("Scraping failed: #{reason}")
    {:error, reason}
  end

  defp scrape_single_product(search_query, max_results) do
    Logger.info("Scraping '#{search_query}' with max results: #{max_results}")

    with {:ok, params} <- validate_input(search_query, max_results),
         {:ok, data} <- scrape_with_retry(params, @default_max_retries) do
      {:ok, data}
    else
      {:error, reason} -> {:error, reason}
    end
  end

  defp validate_input(search_query, max_results) when is_binary(search_query) and is_integer(max_results) and max_results > 0 do
    {:ok, {search_query, max_results}}
  end
  defp validate_input(_, _), do: {:error, "Invalid input parameters"}

  defp scrape_with_retry({search_query, max_results}, 0) do
    {:error, "Max retries reached for '#{search_query}'"}
  end

  defp scrape_with_retry(params, retries) do
    case scrape_attempt(params) do
      {:ok, _} = result -> result
      {:error, reason} ->
        Logger.warn("Retrying due to: #{reason}. Retries left: #{retries - 1}")
        Process.sleep(@retry_delay_ms)
        scrape_with_retry(params, retries - 1)
    end
  end

  defp scrape_attempt({search_query, max_results}) do
    {result, 0} = System.cmd("node", ["path/to/puppeteer_script.js", search_query, Integer.to_string(max_results)])

    case Jason.decode(result) do
      {:ok, %{"success" => true, "data" => data}} ->
        Logger.info("Successfully scraped data for '#{search_query}'")
        {:ok, data}
      {:ok, %{"success" => false, "error" => error}} ->
        {:error, "Puppeteer error: #{error}"}
      {:error, _} ->
        {:error, "JSON parsing failed for response: #{result}"}
    end
  end
end
