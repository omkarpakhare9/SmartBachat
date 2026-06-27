import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../../models/budget.dart';
import '../../../models/category.dart';
import '../../../providers/budget_provider.dart';
import '../../../providers/category_provider.dart';
import '../../../theme/app_theme.dart';
import '../../../widgets/money_decorations.dart';
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
      appBar: GradientAppBar(
        title: 'Budgets',
        actions: [
          IconButton(
            icon: const Icon(Icons.add_circle, color: Colors.white, size: 28),
            onPressed: () => _openBudget(),
          ),
        ],
      ),
      body: MoneyBackground(
        showCoins: false,
        child: budgetProvider.isLoading
            ? const Center(child: CircularProgressIndicator())
            : budgetProvider.error != null
                ? Center(child: Text(budgetProvider.error!))
                : budgetProvider.budgets.isEmpty
                    ? Center(
                        child: Padding(
                          padding: const EdgeInsets.all(28.0),
                          child: Column(
                            mainAxisSize: MainAxisSize.min,
                            children: const [
                              Icon(Icons.savings,
                                  size: 80, color: AppColors.accentDark),
                              SizedBox(height: 12),
                              Text(
                                'No budgets added yet.',
                                style: TextStyle(
                                  color: AppColors.textSecondary,
                                  fontWeight: FontWeight.w600,
                                ),
                              ),
                            ],
                          ),
                        ),
                      )
                    : ListView.builder(
                        padding: const EdgeInsets.fromLTRB(16, 16, 16, 100),
                        itemCount: budgetProvider.budgets.length,
                        itemBuilder: (context, index) {
                          final budget = budgetProvider.budgets[index];
                          final category = categories.firstWhere(
                            (category) => category.id == budget.categoryId,
                            orElse: () => Category(
                                id: budget.categoryId,
                                name: budget.categoryName ??
                                    budget.categoryName ??
                                    'Category',
                                type: 'expense'),
                          );
                          final spent = budget.spent ?? 0;
                          final progress = budget.amount > 0
                              ? (spent / budget.amount).clamp(0, 1).toDouble()
                              : 0.0;
                          final over = progress >= 0.9;

                          return Container(
                            margin: const EdgeInsets.only(bottom: 14),
                            padding: const EdgeInsets.all(16),
                            decoration: BoxDecoration(
                              color: Colors.white,
                              borderRadius: BorderRadius.circular(20),
                              boxShadow: [
                                BoxShadow(
                                  color: Colors.black.withOpacity(0.05),
                                  blurRadius: 12,
                                  offset: const Offset(0, 4),
                                ),
                              ],
                            ),
                            child: InkWell(
                              borderRadius: BorderRadius.circular(20),
                              onTap: () => _openBudget(budget),
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Row(
                                    children: [
                                      Container(
                                        width: 44,
                                        height: 44,
                                        decoration: BoxDecoration(
                                          gradient: over
                                              ? AppColors.expenseGradient
                                              : AppColors.goldGradient,
                                          borderRadius:
                                              BorderRadius.circular(14),
                                        ),
                                        child: Icon(
                                          over
                                              ? Icons.warning_amber_rounded
                                              : Icons.savings,
                                          color: Colors.white,
                                        ),
                                      ),
                                      const SizedBox(width: 12),
                                      Expanded(
                                        child: Column(
                                          crossAxisAlignment:
                                              CrossAxisAlignment.start,
                                          children: [
                                            Text(
                                              category.name,
                                              style: const TextStyle(
                                                fontWeight: FontWeight.w800,
                                                fontSize: 16,
                                              ),
                                            ),
                                            Text(
                                              'Period: ${budget.period}',
                                              style: const TextStyle(
                                                color:
                                                    AppColors.textSecondary,
                                                fontSize: 12,
                                              ),
                                            ),
                                          ],
                                        ),
                                      ),
                                      IconButton(
                                        icon: const Icon(Icons.delete_outline,
                                            color: AppColors.rose),
                                        onPressed: () async {
                                          final confirmed =
                                              await showDialog<bool>(
                                            context: context,
                                            builder: (context) => AlertDialog(
                                              title:
                                                  const Text('Delete budget'),
                                              content: const Text(
                                                  'Delete this budget?'),
                                              actions: [
                                                TextButton(
                                                    onPressed: () =>
                                                        Navigator.pop(
                                                            context, false),
                                                    child:
                                                        const Text('Cancel')),
                                                TextButton(
                                                    onPressed: () =>
                                                        Navigator.pop(
                                                            context, true),
                                                    child:
                                                        const Text('Delete')),
                                              ],
                                            ),
                                          );
                                          if (confirmed == true) {
                                            await budgetProvider
                                                .deleteBudget(budget.id);
                                          }
                                        },
                                      ),
                                    ],
                                  ),
                                  const SizedBox(height: 12),
                                  ClipRRect(
                                    borderRadius: BorderRadius.circular(8),
                                    child: LinearProgressIndicator(
                                      value: progress,
                                      minHeight: 10,
                                      backgroundColor: const Color(0xFFE5E7EB),
                                      valueColor: AlwaysStoppedAnimation(
                                        over
                                            ? AppColors.rose
                                            : AppColors.primary,
                                      ),
                                    ),
                                  ),
                                  const SizedBox(height: 8),
                                  Row(
                                    mainAxisAlignment:
                                        MainAxisAlignment.spaceBetween,
                                    children: [
                                      Text(
                                        '₹${spent.toStringAsFixed(2)} spent',
                                        style: const TextStyle(
                                          fontWeight: FontWeight.w700,
                                          color: AppColors.textPrimary,
                                        ),
                                      ),
                                      Text(
                                        'of ₹${budget.amount.toStringAsFixed(2)}',
                                        style: const TextStyle(
                                          color: AppColors.textSecondary,
                                          fontWeight: FontWeight.w500,
                                        ),
                                      ),
                                    ],
                                  ),
                                ],
                              ),
                            ),
                          );
                        },
                      ),
      ),
    );
  }
}
