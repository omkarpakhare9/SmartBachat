import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../../models/budget.dart';
import '../../../providers/budget_provider.dart';
import '../../../providers/category_provider.dart';

class AddEditBudgetScreen extends StatefulWidget {
  final Budget? budget;

  const AddEditBudgetScreen({super.key, this.budget});

  @override
  State<AddEditBudgetScreen> createState() => _AddEditBudgetScreenState();
}

class _AddEditBudgetScreenState extends State<AddEditBudgetScreen> {
  final _formKey = GlobalKey<FormState>();
  final _amountController = TextEditingController();
  String? _categoryId;
  String _period = 'monthly';
  int _year = DateTime.now().year;
  int _month = DateTime.now().month;
  bool _isInitialized = false;

  @override
  void initState() {
    super.initState();
    if (widget.budget != null) {
      _amountController.text = widget.budget!.amount.toStringAsFixed(2);
      _categoryId = widget.budget!.categoryId;
      _period = widget.budget!.period;
      _year = widget.budget!.year;
      _month = widget.budget!.month;
    }
  }

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    if (!_isInitialized) {
      final categoryProvider = Provider.of<CategoryProvider>(context);
      if (categoryProvider.categories.isEmpty && !categoryProvider.isLoading) {
        categoryProvider.fetchCategories(type: 'expense');
      }
      _isInitialized = true;
    }
  }

  @override
  void dispose() {
    _amountController.dispose();
    super.dispose();
  }

  Future<void> _saveBudget() async {
    if (!_formKey.currentState!.validate() || _categoryId == null) {
      return;
    }

    final amount = double.tryParse(_amountController.text) ?? 0;
    final provider = Provider.of<BudgetProvider>(context, listen: false);
    final success = widget.budget == null
        ? await provider.addBudget(
            categoryId: _categoryId!,
            amount: amount,
            period: _period,
            year: _year,
            month: _month,
          )
        : await provider.updateBudget(
            id: widget.budget!.id,
            categoryId: _categoryId!,
            amount: amount,
            period: _period,
            year: _year,
            month: _month,
          );

    if (success && mounted) {
      Navigator.pop(context, true);
    }
  }

  @override
  Widget build(BuildContext context) {
    final categoryProvider = Provider.of<CategoryProvider>(context);
    final budgetProvider = Provider.of<BudgetProvider>(context);
    final categories = categoryProvider.categories.where((category) => category.type == 'expense').toList();

    if (_categoryId == null && categories.isNotEmpty) {
      _categoryId = categories.first.id;
    }

    return Scaffold(
      appBar: AppBar(
        title: Text(widget.budget == null ? 'Add Budget' : 'Edit Budget'),
      ),
      body: Padding(
        padding: const EdgeInsets.all(16),
        child: Form(
          key: _formKey,
          child: Column(
            children: [
              DropdownButtonFormField<String>(
                value: _categoryId,
                decoration: const InputDecoration(
                  labelText: 'Category',
                  border: OutlineInputBorder(),
                ),
                items: categories.map<DropdownMenuItem<String>>((category) {
                  return DropdownMenuItem<String>(
                    value: category.id,
                    child: Text(category.name),
                  );
                }).toList(),
                onChanged: (value) => setState(() => _categoryId = value),
                validator: (value) => value == null ? 'Select a category' : null,
              ),
              const SizedBox(height: 16),
              TextFormField(
                controller: _amountController,
                decoration: const InputDecoration(
                  labelText: 'Budget Amount',
                  prefixText: '₹ ',
                  border: OutlineInputBorder(),
                ),
                keyboardType: const TextInputType.numberWithOptions(decimal: true),
                validator: (value) {
                  if (value == null || value.isEmpty) return 'Amount is required';
                  if (double.tryParse(value) == null) return 'Enter a valid number';
                  return null;
                },
              ),
              const SizedBox(height: 16),
              DropdownButtonFormField<String>(
                value: _period,
                decoration: const InputDecoration(
                  labelText: 'Period',
                  border: OutlineInputBorder(),
                ),
                items: const [
                  DropdownMenuItem(value: 'monthly', child: Text('Monthly')),
                  DropdownMenuItem(value: 'weekly', child: Text('Weekly')),
                ],
                onChanged: (value) => setState(() {
                  if (value != null) _period = value;
                }),
              ),
              const SizedBox(height: 16),
              Row(
                children: [
                  Expanded(
                    child: DropdownButtonFormField<int>(
                      value: _month,
                      decoration: const InputDecoration(
                        labelText: 'Month',
                        border: OutlineInputBorder(),
                      ),
                      items: List.generate(12, (index) {
                        final month = index + 1;
                        return DropdownMenuItem(
                          value: month,
                          child: Text(month.toString()),
                        );
                      }),
                      onChanged: (value) {
                        if (value != null) setState(() => _month = value);
                      },
                    ),
                  ),
                  const SizedBox(width: 16),
                  Expanded(
                    child: DropdownButtonFormField<int>(
                      value: _year,
                      decoration: const InputDecoration(
                        labelText: 'Year',
                        border: OutlineInputBorder(),
                      ),
                      items: List.generate(5, (index) {
                        final year = DateTime.now().year - 2 + index;
                        return DropdownMenuItem<int>(
                          value: year,
                          child: Text(year.toString()),
                        );
                      }),
                      onChanged: (value) {
                        if (value != null) setState(() => _year = value);
                      },
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 24),
              if (budgetProvider.error != null)
                Padding(
                  padding: const EdgeInsets.only(bottom: 12),
                  child: Text(
                    budgetProvider.error!,
                    style: const TextStyle(color: Colors.red),
                  ),
                ),
              ElevatedButton(
                onPressed: budgetProvider.isSubmitting ? null : _saveBudget,
                child: budgetProvider.isSubmitting
                    ? const SizedBox(
                        width: 20,
                        height: 20,
                        child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white),
                      )
                    : Text(widget.budget == null ? 'Create Budget' : 'Save Budget'),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
