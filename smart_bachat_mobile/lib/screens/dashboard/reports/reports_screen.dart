import 'package:fl_chart/fl_chart.dart';
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../../providers/report_provider.dart';

class ReportsScreen extends StatefulWidget {
  const ReportsScreen({super.key});

  @override
  State<ReportsScreen> createState() => _ReportsScreenState();
}

class _ReportsScreenState extends State<ReportsScreen> {
  bool _isInitialized = false;

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    if (!_isInitialized) {
      final reportProvider = Provider.of<ReportProvider>(context, listen: false);
      reportProvider.fetchSummary();
      reportProvider.fetchCategoryBreakdown();
      reportProvider.fetchMonthlyTrends(year: DateTime.now().year);
      _isInitialized = true;
    }
  }

  Widget _buildSummaryCard(String label, String value, Color color) {
    return Expanded(
      child: Container(
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: color.withOpacity(0.12),
          borderRadius: BorderRadius.circular(12),
          border: Border.all(color: color.withOpacity(0.3)),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(label, style: const TextStyle(fontWeight: FontWeight.bold)),
            const SizedBox(height: 8),
            Text(value, style: TextStyle(fontSize: 18, color: color, fontWeight: FontWeight.bold)),
          ],
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final reportProvider = Provider.of<ReportProvider>(context);
    final summary = reportProvider.summary;
    final categoryData = reportProvider.categoryBreakdown;
    final monthly = reportProvider.monthlyTrends;

    return Scaffold(
      appBar: AppBar(
        title: const Text('Reports'),
      ),
      body: reportProvider.isLoading
          ? const Center(child: CircularProgressIndicator())
          : reportProvider.error != null
              ? Center(child: Text(reportProvider.error!))
              : SingleChildScrollView(
                  padding: const EdgeInsets.all(16),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        children: [
                          _buildSummaryCard('Income', '₹ ${summary['displayIncome'] ?? '0.00'}', Colors.green),
                          const SizedBox(width: 12),
                          _buildSummaryCard('Expense', '₹ ${summary['displayExpense'] ?? '0.00'}', Colors.red),
                        ],
                      ),
                      const SizedBox(height: 12),
                      _buildSummaryCard('Balance', '₹ ${summary['displayBalance'] ?? '0.00'}', Colors.blue),
                      const SizedBox(height: 24),
                      Text('Category Breakdown', style: Theme.of(context).textTheme.titleLarge),
                      const SizedBox(height: 12),
                      if (categoryData.isEmpty)
                        const Text('No category data available yet.')
                      else
                        SizedBox(
                          height: 220,
                          child: PieChart(
                            PieChartData(
                              sections: categoryData.map((data) {
                                final value = data['total'] as num? ?? 0;
                                return PieChartSectionData(
                                  color: Colors.primaries[categoryData.indexOf(data) % Colors.primaries.length].withOpacity(0.7),
                                  value: value.toDouble(),
                                  title: '${data['displayTotal'] ?? 0}',
                                  radius: 70,
                                );
                              }).toList(),
                              sectionsSpace: 4,
                              centerSpaceRadius: 30,
                            ),
                          ),
                        ),
                      const SizedBox(height: 16),
                      ...categoryData.map((data) {
                        return ListTile(
                          contentPadding: EdgeInsets.zero,
                          title: Text(data['categoryName'] ?? 'Unknown'),
                          trailing: Text('₹ ${data['displayTotal'] ?? '0.00'}'),
                        );
                      }),
                      const SizedBox(height: 24),
                      Text('Monthly Trends', style: Theme.of(context).textTheme.titleLarge),
                      const SizedBox(height: 12),
                      if (monthly.isEmpty)
                        const Text('No monthly trend data available.')
                      else
                        SizedBox(
                          height: 240,
                          child: BarChart(
                            BarChartData(
                              alignment: BarChartAlignment.spaceBetween,
                              maxY: monthly.map((e) => (e['income'] as num? ?? 0).toDouble()).fold(0.0, (max, value) => value > max ? value : max) + 20,
                              barGroups: monthly.map((row) {
                                final monthIndex = (row['month'] as num?)?.toInt() ?? 0;
                                return BarChartGroupData(
                                  x: monthIndex,
                                  barRods: [
                                    BarChartRodData(
                                      toY: (row['income'] as num? ?? 0).toDouble(),
                                      color: Colors.green,
                                      width: 10,
                                    ),
                                    BarChartRodData(
                                      toY: (row['expense'] as num? ?? 0).toDouble(),
                                      color: Colors.red,
                                      width: 10,
                                    ),
                                  ],
                                );
                              }).toList(),
                              titlesData: FlTitlesData(
                                leftTitles: AxisTitles(sideTitles: SideTitles(showTitles: true)),
                                bottomTitles: AxisTitles(
                                  sideTitles: SideTitles(
                                    showTitles: true,
                                    getTitlesWidget: (value, meta) {
                                      final month = value.toInt();
                                      return SideTitleWidget(
                                        axisSide: meta.axisSide,
                                        child: Text('${month.toString().padLeft(2, '0')}'),
                                      );
                                    },
                                  ),
                                ),
                              ),
                            ),
                          ),
                        ),
                    ],
                  ),
                ),
    );
  }
}
