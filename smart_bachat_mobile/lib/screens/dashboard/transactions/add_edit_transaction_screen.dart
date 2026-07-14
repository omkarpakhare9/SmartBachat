import 'dart:io';

import 'package:flutter/material.dart';
import 'package:image_picker/image_picker.dart';
import 'package:intl/intl.dart';
import 'package:provider/provider.dart';

import '../../../models/transaction.dart';
import '../../../providers/category_provider.dart';
import '../../../providers/transaction_provider.dart';

class AddEditTransactionScreen extends StatefulWidget {
  final Transaction? transaction;

  const AddEditTransactionScreen({super.key, this.transaction});

  @override
  State<AddEditTransactionScreen> createState() => _AddEditTransactionScreenState();
}

class _AddEditTransactionScreenState extends State<AddEditTransactionScreen> {
  final _formKey = GlobalKey<FormState>();
  final _amountController = TextEditingController();
  final _descriptionController = TextEditingController();
  String _type = 'expense';
  String? _categoryId;
  DateTime _selectedDate = DateTime.now();
  String? _receiptPath;
  bool _isInitialized = false;

  @override
  void initState() {
    super.initState();
    if (widget.transaction != null) {
      _type = widget.transaction!.type;
      _amountController.text = widget.transaction!.amount.toStringAsFixed(2);
      _descriptionController.text = widget.transaction!.description;
      _categoryId = widget.transaction!.categoryId;
      _selectedDate = widget.transaction!.date;
    }
  }

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    if (!_isInitialized) {
      final categoryProvider = Provider.of<CategoryProvider>(context);
      if (categoryProvider.categories.isEmpty && !categoryProvider.isLoading) {
        categoryProvider.fetchCategories();
      }
      _isInitialized = true;
    }
  }

  @override
  void dispose() {
    _amountController.dispose();
    _descriptionController.dispose();
    super.dispose();
  }

  Future<void> _pickReceipt() async {
    final picker = ImagePicker();
    final result = await picker.pickImage(source: ImageSource.gallery, imageQuality: 85);
    if (result != null) {
      setState(() {
        _receiptPath = result.path;
      });
    }
  }

  Future<void> _saveTransaction() async {
    if (!_formKey.currentState!.validate() || _categoryId == null) {
      return;
    }

    final amount = double.tryParse(_amountController.text) ?? 0;
    final provider = Provider.of<TransactionProvider>(context, listen: false);

    final success = widget.transaction == null
        ? await provider.addTransaction(
            type: _type,
            amount: amount,
            categoryId: _categoryId!,
            description: _descriptionController.text.trim(),
            date: _selectedDate,
            receiptPath: _receiptPath,
          )
        : await provider.updateTransaction(
            id: widget.transaction!.id,
            type: _type,
            amount: amount,
            categoryId: _categoryId!,
            description: _descriptionController.text.trim(),
            date: _selectedDate,
            receiptPath: _receiptPath,
          );

    if (success && mounted) {
      Navigator.pop(context, true);
    }
  }

  @override
  Widget build(BuildContext context) {
    final categoryProvider = Provider.of<CategoryProvider>(context);
    final transactionProvider = Provider.of<TransactionProvider>(context);
    final categories = categoryProvider.categories.where((category) => category.type == _type).toList();

    if (_categoryId == null && categories.isNotEmpty) {
      _categoryId = categories.first.id;
    }

    return Scaffold(
      appBar: AppBar(
        title: Text(widget.transaction == null ? 'Add Transaction' : 'Edit Transaction'),
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16),
        child: Form(
          key: _formKey,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Text('Type', style: TextStyle(fontWeight: FontWeight.bold)),
              const SizedBox(height: 8),
              ToggleButtons(
                isSelected: [_type == 'expense', _type == 'income'],
                onPressed: (index) {
                  setState(() {
                    _type = index == 0 ? 'expense' : 'income';
                    _categoryId = null;
                  });
                },
                children: const [
                  Padding(
                    padding: EdgeInsets.symmetric(horizontal: 16),
                    child: Text('Expense'),
                  ),
                  Padding(
                    padding: EdgeInsets.symmetric(horizontal: 16),
                    child: Text('Income'),
                  ),
                ],
              ),
              const SizedBox(height: 16),
              TextFormField(
                controller: _amountController,
                decoration: const InputDecoration(
                  labelText: 'Amount',
                  prefixText: '₹ ',
                  border: OutlineInputBorder(),
                ),
                keyboardType: const TextInputType.numberWithOptions(decimal: true),
                validator: (value) {
                  if (value == null || value.isEmpty) {
                    return 'Amount is required';
                  }
                  if (double.tryParse(value) == null) {
                    return 'Enter a valid number';
                  }
                  return null;
                },
              ),
              const SizedBox(height: 16),
              DropdownButtonFormField<String>(
                value: _categoryId,
                decoration: InputDecoration(
                  labelText: 'Category',
                  border: const OutlineInputBorder(),
                  helperText: categoryProvider.isLoading
                      ? 'Loading categories...'
                      : (categories.isEmpty
                          ? (categoryProvider.error ??
                              'No $_type categories yet. Log out and back in to seed defaults.')
                          : null),
                  helperStyle: TextStyle(
                    color: categories.isEmpty && !categoryProvider.isLoading
                        ? Colors.red
                        : null,
                  ),
                ),
                items: categories.map<DropdownMenuItem<String>>((category) {
                  return DropdownMenuItem<String>(
                    value: category.id,
                    child: Text(category.name),
                  );
                }).toList(),
                onChanged: categories.isEmpty
                    ? null
                    : (value) => setState(() => _categoryId = value),
                validator: (value) => value == null ? 'Select a category' : null,
              ),
              const SizedBox(height: 16),
              TextFormField(
                controller: _descriptionController,
                decoration: const InputDecoration(
                  labelText: 'Description',
                  border: OutlineInputBorder(),
                ),
                minLines: 1,
                maxLines: 3,
                validator: (value) {
                  if (value == null || value.isEmpty) {
                    return 'Description is required';
                  }
                  return null;
                },
              ),
              const SizedBox(height: 16),
              GestureDetector(
                onTap: () async {
                  final selected = await showDatePicker(
                    context: context,
                    initialDate: _selectedDate,
                    firstDate: DateTime.now().subtract(const Duration(days: 365)),
                    lastDate: DateTime.now().add(const Duration(days: 365)),
                  );
                  if (selected != null) {
                    setState(() => _selectedDate = selected);
                  }
                },
                child: InputDecorator(
                  decoration: const InputDecoration(
                    labelText: 'Date',
                    border: OutlineInputBorder(),
                  ),
                  child: Text(DateFormat.yMMMd().format(_selectedDate)),
                ),
              ),
              const SizedBox(height: 16),
              Text('Receipt', style: Theme.of(context).textTheme.bodyLarge),
              const SizedBox(height: 8),
              Row(
                children: [
                  ElevatedButton.icon(
                    icon: const Icon(Icons.upload_file),
                    label: const Text('Pick Receipt'),
                    onPressed: _pickReceipt,
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Text(
                      _receiptPath != null
                          ? File(_receiptPath!).path.split(Platform.pathSeparator).last
                          : (widget.transaction?.receiptUrl != null ? 'Receipt available' : 'No receipt selected'),
                      overflow: TextOverflow.ellipsis,
                    ),
                  ),
                ],
              ),
              if (_receiptPath != null) ...[
                const SizedBox(height: 16),
                SizedBox(
                  height: 160,
                  width: double.infinity,
                  child: Image.file(File(_receiptPath!), fit: BoxFit.cover),
                ),
              ],
              const SizedBox(height: 24),
              if (transactionProvider.error != null)
                Padding(
                  padding: const EdgeInsets.only(bottom: 12),
                  child: Text(
                    transactionProvider.error!,
                    style: const TextStyle(color: Colors.red),
                  ),
                ),
              ElevatedButton(
                onPressed: transactionProvider.isSubmitting ? null : _saveTransaction,
                child: transactionProvider.isSubmitting
                    ? const SizedBox(
                        height: 20,
                        width: 20,
                        child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white),
                      )
                    : Text(widget.transaction == null ? 'Create Transaction' : 'Save Changes'),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
