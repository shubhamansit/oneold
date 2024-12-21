// "use client";
// import { useEffect, useState } from "react";
// import { Button } from "@/components/ui/button";
// import SelectBox from "react-select";
// import { X } from "lucide-react";
// import { Label } from "@/components/ui/label";
// import { NestedDropdownCheckbox } from "./NestedDropdownCheckbox";
// import { eastZone, wastZone } from "@/data";
// import { Calendar } from "./ui/calendar";
// import { DateRange } from "react-day-picker";
// import ExportExcel from "./ExportExcel";

// const FiltersForm: React.FC<{
//   formData: any;
//   onClose: () => void;
//   onCheckedItemsChange: (items: string[]) => void;
//   onFormDataChange: (newFormData: any) => void;
//   dateRange?: DateRange;
//   onDateRangeChange: (date: DateRange | undefined) => void;
//   filteredData: any[];
// }> = ({
//   formData,
//   onClose,
//   onCheckedItemsChange,
//   onFormDataChange,
//   dateRange,
//   onDateRangeChange,
//   filteredData,
// }) => {
//   const companyOptions = [{ value: "BMC", label: "BMC" }];
//   const branchOptions = [{ value: "BMC", label: "BMC" }];
//   const townOptions = [{ value: "BHAVNAGAR_OSC", label: "BHAVNAGAR_OSC" }];
//   const zoneOptions = [
//     { value: "EAST_ZONE", label: "EAST_ZONE" },
//     { value: "WEST_ZONE", label: "WEST_ZONE" },
//     { value: "GENERAL", label: "GENERAL" },
//   ];
//   const [wardOptions, setWardOptions] = useState<any[]>([]);
//   const [validate, setValidate] = useState(false);
//   const [isXlS, setIsXLS] = useState<boolean>(false);
//   const [isPDF, setIsPDF] = useState<boolean>(false);

//   useEffect(() => {
//     // Update ward options based on selected zone
//     if (formData.zone.value === "WEST_ZONE") {
//       const wardData = wastZone.map((zone) => zone.Ward);
//       const uniqueWardData = [...new Set(wardData)].map((data) => ({
//         value: data,
//         label: data,
//       }));
//       setWardOptions(uniqueWardData);
//     } else if (formData.zone.value === "EAST_ZONE") {
//       const wardData = eastZone.map((zone) => zone.Ward);
//       const uniqueWardData = [...new Set(wardData)].map((data) => ({
//         value: data,
//         label: data,
//       }));
//       setWardOptions(uniqueWardData);
//     } else {
//       const wardData = [...wastZone, ...eastZone].map((zone) => zone.Ward);
//       const uniqueWardData = [...new Set(wardData)].map((data) => ({
//         value: data,
//         label: data,
//       }));
//       setWardOptions(uniqueWardData);
//     }
//     setValidate((prev) => !prev);
//   }, [formData.zone]);

//   useEffect(() => {
//     setValidate((prev) => !prev);
//   }, [formData.ward]);

//   const handleChange = (selectedOptions: any, actionMeta: any) => {
//     if (actionMeta.name == "zone") {
//       onFormDataChange({
//         ...formData,
//         [actionMeta.name]: selectedOptions,
//         ward: { value: "All", label: "All" },
//       });
//       onCheckedItemsChange([]);
//       return;
//     }
//     onFormDataChange({ ...formData, [actionMeta.name]: selectedOptions });
//   };

//   return (
//     <div className="h-full flex overflow-y-scroll flex-col">
//       <div className="flex justify-between items-center p-4 border-b">
//         <h2 className="text-lg font-semibold">Filters</h2>
//         <Button variant="ghost" size="icon" onClick={onClose}>
//           <X className="h-4 w-4" />
//           <span className="sr-only">Close filters</span>
//         </Button>
//       </div>
//       <div className="flex gap-4 p-4">
//         <div className="flex flex-col w-72 gap-4">
//           <Label htmlFor="company">Company</Label>
//           <SelectBox
//             isMulti
//             name="company"
//             options={companyOptions}
//             onChange={handleChange}
//             value={formData.company}
//           />
//           <Label htmlFor="branch">Branch</Label>
//           <SelectBox
//             isMulti
//             name="branch"
//             options={branchOptions}
//             onChange={handleChange}
//             value={formData.branch}
//           />
//           <Label htmlFor="town">Town</Label>
//           <SelectBox
//             isMulti
//             name="town"
//             options={townOptions}
//             onChange={handleChange}
//             value={formData.town}
//           />
//           <Label htmlFor="zone">Zone</Label>
//           <SelectBox
//             name="zone"
//             options={zoneOptions}
//             onChange={handleChange}
//             value={formData.zone}
//           />
//           <Label htmlFor="ward">Ward</Label>
//           <SelectBox
//             name="ward"
//             options={wardOptions}
//             onChange={handleChange}
//             value={formData.ward}
//           />
//         </div>
//         <div className="flex-grow flex flex-col p-4 gap-4">
//           <Label>Date Range</Label>
//           <Calendar
//             mode="range"
//             selected={dateRange}
//             onSelect={onDateRangeChange}
//             className="rounded-md border"
//           />
//           <NestedDropdownCheckbox
//             zone={formData.zone}
//             ward={formData.ward}
//             onCheckedItemsChange={onCheckedItemsChange}
//             validate={validate}
//           />
//           <div className="w-full flex items-center gap-2 relative">
//             <Button
//               type="submit"
//               className="w-1/2 bg-[#DB4848]"
//               onClick={onClose}
//             >
//               Apply
//             </Button>

//             <Button
//               className="w-1/2 bg-[#DB4848]"
//               onMouseMove={() => setIsXLS(true)}
//               // onMouseLeave={handleExportLeave}
//             >
//               XLS
//             </Button>
//             {/* <Button
//               className="w-1/4 bg-[#DB4848]"
//               onMouseMove={() => setIsPDF(true)}
//               // onMouseLeave={handleExportLeave}
//             >
//               PDF
//             </Button> */}

//             {isXlS ? (
//               <div
//                 className="xlsx bg-[#DB4848] text-white transition-all ease-in-out absolute -top-24 right-0 flex flex-col justify-start p-2 shadow-lg rounded-md overflow-hidden z-50"
//                 onMouseLeave={() => setIsXLS(false)}
//               >
//                 <ExportExcel data={filteredData} exportMode="summary" />
//                 <ExportExcel data={filteredData} exportMode="details" />
//               </div>
//             ) : (
//               ""
//             )}
//             {/* {isPDF ? (
//               <div
//                 className="pdf bg-[#DB4848]  p-2 shadow-lg rounded-md overflow-hidden z-50  text-white absolute -top-24 right-0 flex flex-col justify-start "
//                 onMouseLeave={() => setIsPDF(false)}
//               >
//                 <ExportPdf data={filteredData} exportMode="summary" />
//                 <ExportPdf data={filteredData} exportMode="details" />
//               </div>
//             ) : (
//               ""
//             )} */}
//           </div>
//         </div>
//       </div>
//     </div>
//   );
// };

// export default FiltersForm;
"use client";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import SelectBox from "react-select";
import { X } from "lucide-react";
import { Label } from "@/components/ui/label";
import { NestedDropdownCheckbox } from "./NestedDropdownCheckbox";
import { BRIGRAJSINH, eastZone, wastZone } from "@/data";
import { Calendar } from "./ui/calendar";
import { DateRange } from "react-day-picker";
import ExportExcel from "./ExportExcel";

interface Option {
  value: string;
  label: string;
}

interface FormData {
  company: Option[];
  branch: Option[];
  town: Option;
  zone: Option;
  ward: Option;
}

interface FiltersFormProps {
  formData: FormData;
  onClose: () => void;
  onCheckedItemsChange: (items: string[]) => void;
  onFormDataChange: (newFormData: FormData) => void;
  dateRange?: DateRange;
  onDateRangeChange: (date: DateRange | undefined) => void;
  filteredData: any[];
}

const FiltersForm: React.FC<FiltersFormProps> = ({
  formData,
  onClose,
  onCheckedItemsChange,
  onFormDataChange,
  dateRange,
  onDateRangeChange,
  filteredData,
}) => {
  // Initialize options with proper typing
  const [companyOptions] = useState<Option[]>([{ value: "BMC", label: "BMC" }]);

  const [branchOptions] = useState<Option[]>([{ value: "BMC", label: "BMC" }]);

  const [townOptions] = useState<Option[]>([
    { value: "BHAVNAGAR_OSC", label: "BHAVNAGAR_OSC" },
    { value: "BRIGRAJSINH", label: "BRIGRAJSINH" },
  ]);

  const [zoneOptions, setZoneOptions] = useState<Option[]>([
    { value: "EAST_ZONE", label: "EAST_ZONE" },
    { value: "WEST_ZONE", label: "WEST_ZONE" },
    { value: "GENERAL", label: "GENERAL" },
  ]);

  const [wardOptions, setWardOptions] = useState<Option[]>([]);
  const [validate, setValidate] = useState(false);
  const [isXlS, setIsXLS] = useState<boolean>(false);

  // Reset zone options when component mounts
  useEffect(() => {
    if (formData.town?.value === "BRIGRAJSINH") {
      setZoneOptions([{ value: "WEST_ZONE", label: "WEST_ZONE" }]);
    } else {
      setZoneOptions([
        { value: "EAST_ZONE", label: "EAST_ZONE" },
        { value: "WEST_ZONE", label: "WEST_ZONE" },
        { value: "GENERAL", label: "GENERAL" },
      ]);
    }
  }, [formData.town]);

  // Update ward options based on selected zone

  useEffect(() => {
    if (!formData.zone?.value) return;

    let wardData: string[] = [];

    if (formData.town?.value === "BRIGRAJSINH") {
      if (formData.zone.value === "WEST_ZONE") {
        wardData = BRIGRAJSINH.map((zone) => zone.Ward);
      }
    } else {
      if (formData.zone.value === "WEST_ZONE") {
        wardData = wastZone.map((zone) => zone.Ward);
      } else if (formData.zone.value === "EAST_ZONE") {
        wardData = eastZone.map((zone) => zone.Ward);
      } else {
        wardData = [...wastZone, ...eastZone].map((zone) => zone.Ward);
      }
    }

    const uniqueWardData = Array.from(new Set(wardData)).map((ward) => ({
      value: ward,
      label: ward,
    }));

    setWardOptions([{ value: "All", label: "All" }, ...uniqueWardData]);
    setValidate((prev) => !prev);
  }, [formData.zone]);

  // Update validation when ward changes
  useEffect(() => {
    setValidate((prev) => !prev);
  }, [formData.ward]);

  const handleChange = (selectedOptions: any, actionMeta: any) => {
    switch (actionMeta.name) {
      case "town":
        if (selectedOptions?.value === "BRIGRAJSINH") {
          const newFormData = {
            ...formData,
            town: selectedOptions,
            zone: { value: "WEST_ZONE", label: "WEST_ZONE" },
            ward: { value: "All", label: "All" },
          };
          onFormDataChange(newFormData);
          onCheckedItemsChange([]);
        } else {
          onFormDataChange({
            ...formData,
            [actionMeta.name]: selectedOptions,
          });
        }
        break;

      case "zone":
        if (formData.town?.value !== "BRIGRAJSINH") {
          const newFormData = {
            ...formData,
            zone: selectedOptions,
            ward: { value: "All", label: "All" },
          };
          onFormDataChange(newFormData);
          onCheckedItemsChange([]);
        }
        break;

      default:
        onFormDataChange({
          ...formData,
          [actionMeta.name]: selectedOptions,
        });
    }
  };

  return (
    <div className="h-full flex overflow-y-scroll flex-col">
      <div className="flex justify-between items-center p-4 border-b">
        <h2 className="text-lg font-semibold">Filters</h2>
        <Button variant="ghost" size="icon" onClick={onClose}>
          <X className="h-4 w-4" />
          <span className="sr-only">Close filters</span>
        </Button>
      </div>
      <div className="flex gap-4 p-4">
        <div className="flex flex-col w-72 gap-4">
          <Label htmlFor="company">Company</Label>
          <SelectBox
            isMulti
            name="company"
            options={companyOptions}
            onChange={handleChange}
            value={formData.company}
          />
          <Label htmlFor="branch">Branch</Label>
          <SelectBox
            isMulti
            name="branch"
            options={branchOptions}
            onChange={handleChange}
            value={formData.branch}
          />
          <Label htmlFor="town">Town</Label>
          <SelectBox
            name="town"
            options={townOptions}
            onChange={handleChange}
            value={formData.town}
            isClearable={false}
          />
          <Label htmlFor="zone">Zone</Label>
          <SelectBox
            name="zone"
            options={zoneOptions}
            onChange={handleChange}
            value={formData.zone}
            isClearable={false}
          />
          <Label htmlFor="ward">Ward</Label>
          <SelectBox
            name="ward"
            options={wardOptions}
            onChange={handleChange}
            value={formData.ward}
            isClearable={false}
          />
        </div>
        <div className="flex-grow flex flex-col p-4 gap-4">
          <Label>Date Range</Label>
          <Calendar
            mode="range"
            selected={dateRange}
            onSelect={onDateRangeChange}
            className="rounded-md border"
          />
          <NestedDropdownCheckbox
            town={formData.town}
            zone={formData.zone}
            ward={formData.ward}
            onCheckedItemsChange={onCheckedItemsChange}
            validate={validate}
          />
          <div className="w-full flex items-center gap-2 relative">
            <Button
              type="submit"
              className="w-1/2 bg-[#DB4848]"
              onClick={onClose}
            >
              Apply
            </Button>

            <Button
              className="w-1/2 bg-[#DB4848]"
              onMouseMove={() => setIsXLS(true)}
            >
              XLS
            </Button>

            {isXlS && (
              <div
                className="xlsx bg-[#DB4848] text-white transition-all ease-in-out absolute -top-24 right-0 flex flex-col justify-start p-2 shadow-lg rounded-md overflow-hidden z-50"
                onMouseLeave={() => setIsXLS(false)}
              >
                <ExportExcel data={filteredData} exportMode="summary" />
                <ExportExcel data={filteredData} exportMode="details" />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default FiltersForm;
