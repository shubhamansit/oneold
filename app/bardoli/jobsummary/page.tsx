"use client";

import { useEffect, useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Filter, Search } from "lucide-react";
import { getBardoli } from "@/data/index";
import ExpandableTable from "@/components/ExpandableTable";
import { DateRange } from "react-day-picker";
import BardoliFiltersForm from "@/components/bardoli/BardoliFiltersForm";
import { useRouter } from "next/navigation";
import Cookies from "js-cookie";

function normalizeText(value: unknown) {
  return String(value || "")
    .toUpperCase()
    .replace(/\s+/g, " ")
    .trim();
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** Precise job-name search: "ROUTE 1" matches only ROUTE 1, not ROUTE 11/12/... */
function matchesJobSearch(jobName: unknown, searchTerm: string) {
  const term = normalizeText(searchTerm);
  if (!term) return true;
  const job = normalizeText(jobName);

  const termRoute = term.match(/\bROUTE\s*(\d+)\b/);
  const jobRoute = job.match(/\bROUTE\s*(\d+)\b/);
  if (termRoute && jobRoute) {
    if (parseInt(termRoute[1], 10) !== parseInt(jobRoute[1], 10)) return false;
    const remainder = term.replace(/\bROUTE\s*\d+\b/, "").trim();
    return !remainder || job.includes(remainder);
  }
  if (/^\d+$/.test(term) && jobRoute) {
    return parseInt(term, 10) === parseInt(jobRoute[1], 10);
  }

  // Fallback: whole-phrase match on a non-alphanumeric boundary
  const pattern = new RegExp(`(^|[^A-Z0-9])${escapeRegExp(term)}([^A-Z0-9]|$)`);
  return pattern.test(job);
}

/** Precise vehicle search: full plate, or exact 4-digit plate suffix. */
function matchesVehicleSearch(vehicle: unknown, searchTerm: string) {
  const term = normalizeText(searchTerm);
  if (!term) return true;
  const compactTerm = term.replace(/[^A-Z0-9]/g, "");
  const vehicleText = normalizeText(vehicle);
  const plateMatch = vehicleText.match(/GJ\s*\d{2}\s*[A-Z]{2}\s*\d{4}/);
  const compactPlate = plateMatch
    ? plateMatch[0].replace(/[^A-Z0-9]/g, "")
    : "";

  if (compactPlate && compactTerm) {
    if (compactTerm === compactPlate) return true;
    if (/^\d{4}$/.test(compactTerm)) return compactPlate.endsWith(compactTerm);
    if (compactTerm.length >= 8) return false;
  }

  // Route token in the vehicle string (e.g. "ROUTE 17") stays exact too
  if (/\bROUTE\s*\d+\b/.test(term)) {
    return matchesJobSearch(vehicleText, term);
  }

  const pattern = new RegExp(`(^|[^A-Z0-9])${escapeRegExp(term)}([^A-Z0-9]|$)`);
  return pattern.test(vehicleText);
}

const Page = () => {
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [checkedItems, setCheckedItems] = useState<string[]>([]);
  const [allData, setAllData] = useState<any[]>([]);
  const [filteredData, setFilteredData] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [vehicleSearchTerm, setVehicleSearchTerm] = useState("");
  const [dateRange, setDateRange] = useState<DateRange | undefined>();
  const [formData, setFormData] = useState({
    company: [{ value: "KARNI", label: "KARNI" }],
    branch: [{ value: "KARNI", label: "KARNI" }],
    town: { value: "BARDOLI", label: "BARDOLI" },
    zone: { value: "All", label: "All" },
    ward: { value: "All", label: "All" },
  });
  const router = useRouter();

  useEffect(() => {
    const loadData = async () => {
      try {
        setIsLoading(true);
        const data = await getBardoli();
        setAllData(data);
        setFilteredData(data);
      } catch (error) {
        console.error("Error loading Bardoli data:", error);
        setFilteredData([]);
      } finally {
        setIsLoading(false);
      }
    };
    loadData();
  }, []);

  const applyFilters = useCallback(() => {
    let result = [...allData];

    if (formData.zone.value !== "All") {
      result = result.filter((job) => job.Zone === formData.zone.value);
    }
    if (formData.ward.value !== "All") {
      result = result.filter((job) => job.Ward === formData.ward.value);
    }
    if (checkedItems.length > 0) {
      result = result.filter((job) => checkedItems.includes(job["Job Name"]));
    }
    if (searchTerm) {
      result = result.filter((job) => matchesJobSearch(job["Job Name"], searchTerm));
    }
    if (vehicleSearchTerm) {
      result = result.filter((job: any) =>
        (job.more_details || []).some((detail: any) =>
          matchesVehicleSearch(detail.Vehicle, vehicleSearchTerm)
        )
      );
    }
    if (dateRange?.from && dateRange?.to) {
      const fromDate = new Date(dateRange.from);
      const toDate = new Date(dateRange.to);
      fromDate.setHours(0, 0, 0, 0);
      toDate.setHours(23, 59, 59, 999);
      result = result
        .map((job) => {
          const filteredMoreDetails = (job.more_details || []).filter(
            (detail: any) => {
              const jobDate = new Date(detail.Date);
              return jobDate >= fromDate && jobDate <= toDate;
            }
          );
          return filteredMoreDetails.length > 0
            ? { ...job, more_details: filteredMoreDetails }
            : null;
        })
        .filter((job) => job !== null);
    }

    setFilteredData(result);
  }, [allData, checkedItems, formData, searchTerm, vehicleSearchTerm, dateRange]);

  useEffect(() => {
    if (allData.length > 0) applyFilters();
  }, [applyFilters, allData.length]);

  useEffect(() => {
    setFormData((prev) => ({ ...prev, ward: { value: "All", label: "All" } }));
    setCheckedItems([]);
  }, [formData.zone.value]);

  const toggleFilter = () => setIsFilterOpen(!isFilterOpen);

  return (
    <div className="relative min-h-screen w-full">
      <header className="sticky top-0 z-10 bg-white border-b">
        <div className="container mx-auto px-4 py-4">
          <div className="flex justify-between items-center">
            <h1 className="text-2xl font-bold">Job Summary</h1>
            <div className="flex gap-2 items-center">
              <div className="relative">
                <input
                  type="text"
                  placeholder="Search Job Name"
                  className="border rounded px-2 py-1 pr-8 w-48"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
                <Search className="absolute right-2 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              </div>
              <div className="relative">
                <input
                  type="text"
                  placeholder="Search Vehicle Number"
                  className="border rounded px-2 py-1 pr-8 w-48"
                  value={vehicleSearchTerm}
                  onChange={(e) => setVehicleSearchTerm(e.target.value)}
                />
                <Search className="absolute right-2 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              </div>
              <Button variant="ghost" size="icon" onClick={toggleFilter}>
                <Filter className="h-4 w-4" />
                <span className="sr-only">Toggle filters</span>
              </Button>
              <Button
                onClick={() => {
                  Cookies.remove("isAuthenticated");
                  router.push("/");
                }}
              >
                Logout
              </Button>
            </div>
          </div>
        </div>
      </header>
      <main className="container mx-auto px-4 py-2">
        {isLoading ? (
          <div className="flex justify-center items-center h-64">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-gray-600">Loading data...</p>
            </div>
          </div>
        ) : (
          <ExpandableTable data={filteredData} />
        )}
      </main>

      <div
        className={`fixed top-0 right-0 h-full bg-white shadow-lg transform transition-transform duration-300 ease-in-out ${
          isFilterOpen ? "translate-x-0" : "translate-x-full"
        } z-20`}
      >
        <BardoliFiltersForm
          filteredData={filteredData}
          // @ts-ignore
          formData={formData}
          onClose={toggleFilter}
          onCheckedItemsChange={setCheckedItems}
          onFormDataChange={setFormData}
          dateRange={dateRange}
          onDateRangeChange={setDateRange}
          jobNames={allData.map((j) => j["Job Name"])}
          checkedItems={checkedItems}
        />
      </div>
    </div>
  );
};

export default Page;
