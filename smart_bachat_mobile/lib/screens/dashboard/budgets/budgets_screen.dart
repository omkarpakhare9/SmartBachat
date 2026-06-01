import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../../models/budget.dart';
import '../../../models/category.dart';
import '../../../providers/budget_provider.dart';
import '../../../providers/category_provider.dart';
import 'add_edit_budget_screen.dart';

class BudgetsScreen extends StatefulWidget {
  const BudgetsScreen({super.key});

  @override
  State<BudgetsScreen> createState() => _BudgetsScreenState();
}

class _BudgetsScreenState extends State<BudgetsScreen> {
  bool _isInitialized = false;

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    if (!_isInitialized) {
      Provider.of<BudgetProvider>(context, listen: false).fetchBudgets();
      Provider.of<CategoryProvider>(context, listen: false).fetchCategories(type: 'expense');
      _isInitialized = true;
    }
  }

  Future<void> _openBudget([Budget? budget]) async {
    final result = await Navigator.push<bool?>(
      context,
      MaterialPageRoute(builder: (_) => AddEditBudgetScreen(budget: budget)),
    );
    if (result == true) {
      Provider.of<BudgetProvider>(context, listen: false).fetchBudgets();
    }
  }

  @override
  Widget build(BuildContext context) {
    final budgetProvider = Provider.of<BudgetProvider>(context);
    final categories = Provider.of<CategoryProvider>(context).categories;

    return Scaffold(
      appBar: AppBar(
        title: const Text('Budgets'),
        actions: [
          IconButton(
            icon: const Icon(Icons.add),
            onPressed: () => _openBudget(),
          ),
        ],
      ),
      body: budgetProvider.isLoading
          ? const Center(child: CircularProgressIndicator())
          : budgetProvider.error != null
              ? Center(child: Text(budgetProvider.error!))
              : budgetProvider.budgets.isEmpty
                  ? const Center(child: Text('No budgets added yet.'))
                  : ListView.builder(
                      padding: const EdgeInsets.all(16),
                      itemCount: budgetProvider.budgets.length,
                      itemBuilder: (context, index) {
                        final budget = budgetProvider.budgets[index];
                        final category = categories.firstWhere(
                          (category) => category.id == budget.categoryId,
                          orElse: () => Category(id: budget.categoryId, name: budget.categoryName ?? budget.categoryName ?? 'Category', type: 'expense'),
                        );
                        final spent = budget.spent ?? 0;
                        final progress = budget.amount > 0 ? (spent / budget.amount).clamp(0, 1).toDouble() : 0.0;

                        return Card(
                          margin: const EdgeInsets.only(bottom: 16),
                          child: ListTile(
                            onTap: () => _openBudget(budget),
                            title: Text(category.name),
                            subtitle: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                const SizedBox(height: 4),
                                LinearProgressIndicator(value: progress),
                                const SizedBox(height: 8),
                                Text('Spent ₹${spent.toStringAsFixed(2)} of ₹${budget.amount.toStringAsFixed(2)}'),
                                Text('Period: ${budget.period}'),
                              ],
                            ),
                            trailing: IconButton(
                              icon: const Icon(Icons.delete_outline),
                              onPressed: () async {
                                final confirmed = await showDialog<bool>(
                                  context: context,
                                  builder: (context) => AlertDialog(
                                    title: const Text('Delete budget'),
                                    content: const Text('Delete this budget?'),
                                    actions: [
                                      TextButton(onPressed: () => Navigator.pop(context, false), child: const Text('Cancel')),
                                      TextButton(onPressed: () => Navigator.pop(context, true), child: const Text('Delete')),
                                    ],
                                  ),
                                );
                                if (confirmed == true) {
                                  await budgetProvider.deleteBudget(budget.id);
                                }
                              },
                            ),
                          ),
                        );
                      },
                    ),
    );
  }
}
