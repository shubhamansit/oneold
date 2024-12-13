// import React from "react";
// import {
//   Document,
//   Page,
//   Text,
//   View,
//   StyleSheet,
//   PDFDownloadLink,
// } from "@react-pdf/renderer";
// import { Button } from "@/components/ui/button";

// // Define styles for the PDF
// const styles = StyleSheet.create({
//   page: {
//     padding: 20,
//     fontSize: 10,
//     flexDirection: "column",
//   },
//   header: {
//     fontSize: 16,
//     textAlign: "center",
//     marginBottom: 10,
//   },
//   subHeader: {
//     fontSize: 12,
//     textAlign: "center",
//     marginBottom: 10,
//   },
//   table: {
//     display: "table",
//     width: "100%",
//     marginBottom: 10,
//   },
//   tableRow: {
//     flexDirection: "row",
//   },
//   tableCol: {
//     flex: 1,
//     border: "1px solid #bfbfbf",
//     padding: 5,
//     textAlign: "center",
//   },
//   bold: {
//     fontWeight: "bold",
//   },
// });

// // PDF Content Component
// const PdfDocument = ({ data, title }: { data: any[]; title: string }) => (
//   <Document>
//     <Page size="A4" style={styles.page}>
//       <Text style={styles.header}>{title}</Text>
//       <Text style={styles.subHeader}>
//         {"Job Summary | Report Configuration: All Filters"}
//       </Text>

//       <View style={styles.table}>
//         {/* Table Header */}
//         <View style={[styles.tableRow, styles.bold]}>
//           <Text style={styles.tableCol}>Branch</Text>
//           <Text style={styles.tableCol}>Town</Text>
//           <Text style={styles.tableCol}>Zone</Text>
//           <Text style={styles.tableCol}>Ward</Text>
//           <Text style={styles.tableCol}>Job Name</Text>
//           <Text style={styles.tableCol}>Job Type</Text>
//           <Text style={styles.tableCol}>Total Jobs</Text>
//           <Text style={styles.tableCol}>Completed</Text>
//         </View>

//         {/* Table Rows */}
//         {data.map((item, index) => (
//           <View style={styles.tableRow} key={index}>
//             <Text style={styles.tableCol}>{item.Branch}</Text>
//             <Text style={styles.tableCol}>{item.Town}</Text>
//             <Text style={styles.tableCol}>{item.Zone}</Text>
//             <Text style={styles.tableCol}>{item.Ward}</Text>
//             <Text style={styles.tableCol}>{item["Job Name"]}</Text>
//             <Text style={styles.tableCol}>{item["Job Type"]}</Text>
//             <Text style={styles.tableCol}>{item["Total Jobs"]}</Text>
//             <Text style={styles.tableCol}>{item.Completed}</Text>
//           </View>
//         ))}
//       </View>
//     </Page>
//   </Document>
// );

// const ExportPdf = ({
//   data,
//   exportMode,
// }: {
//   data: any[];
//   exportMode: string;
// }) => {
//   return (
//     <PDFDownloadLink
//       document={<PdfDocument data={data} title="Detailed Job Summary Report" />}
//       fileName="Job_Summary_Report.pdf"
//     >
//       {({ loading }) => (
//         <Button className="w-full h-full hover:bg-zinc-900 bg-[#DB4848]">
//           {!loading && exportMode === "summary"
//             ? "Summary"
//             : "Details with Summary"}
//         </Button>
//       )}
//     </PDFDownloadLink>
//   );
// };

// export default ExportPdf;
