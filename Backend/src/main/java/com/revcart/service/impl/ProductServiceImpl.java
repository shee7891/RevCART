package com.revcart.service.impl;

import com.revcart.dto.PagedResponse;
import com.revcart.dto.ProductDto;
import com.revcart.dto.request.ProductRequest;
import com.revcart.entity.Category;
import com.revcart.entity.Inventory;
import com.revcart.entity.Product;
import com.revcart.exception.ResourceNotFoundException;
import com.revcart.mapper.ProductMapper;
import com.revcart.repository.CategoryRepository;
import com.revcart.repository.InventoryRepository;
import com.revcart.repository.ProductRepository;
import com.revcart.service.ProductService;
import jakarta.transaction.Transactional;
import java.util.List;
import java.util.stream.Collectors;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;

@Service
@Transactional
public class ProductServiceImpl implements ProductService {

    private static final Logger logger = LoggerFactory.getLogger(ProductServiceImpl.class);

    private final ProductRepository productRepository;
    private final CategoryRepository categoryRepository;
    private final InventoryRepository inventoryRepository;

    public ProductServiceImpl(
            ProductRepository productRepository,
            CategoryRepository categoryRepository,
            InventoryRepository inventoryRepository) {
        this.productRepository = productRepository;
        this.categoryRepository = categoryRepository;
        this.inventoryRepository = inventoryRepository;
    }

    @Override
    @CacheEvict(value = "products", allEntries = true)
    public ProductDto create(ProductRequest request) {
        Category category = categoryRepository.findById(request.getCategoryId())
                .orElseThrow(() -> new ResourceNotFoundException("Category not found"));
        Product product = new Product();
        mapProduct(product, request, category);
        Product saved = productRepository.save(product);
        createOrUpdateInventory(saved, request.getQuantity());
        // Refresh the product to ensure the inventory relationship is loaded
        saved = productRepository.findById(saved.getId())
                .orElseThrow(() -> new ResourceNotFoundException("Product not found after save"));
        logger.info("Product created successfully. ID: {}, Stock: {}", saved.getId(),
                saved.getInventory() != null ? saved.getInventory().getAvailableQuantity() : 0);
        return ProductMapper.toDto(saved);
    }

    @Override
    @CacheEvict(value = "products", allEntries = true)
    public ProductDto update(Long id, ProductRequest request) {
        logger.info("Updating product with ID: {}", id);
        logger.debug("Update request - Name: {}, Price: {}, Quantity: {}", request.getName(), request.getPrice(),
                request.getQuantity());
        Product product = productRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Product not found"));
        Category category = categoryRepository.findById(request.getCategoryId())
                .orElseThrow(() -> new ResourceNotFoundException("Category not found"));
        mapProduct(product, request, category);
        createOrUpdateInventory(product, request.getQuantity());
        Product saved = productRepository.save(product);
        // Refresh the product to ensure the inventory relationship is loaded
        saved = productRepository.findById(saved.getId())
                .orElseThrow(() -> new ResourceNotFoundException("Product not found after save"));
        logger.info("Product updated successfully. ID: {}, Stock: {}", saved.getId(),
                saved.getInventory() != null ? saved.getInventory().getAvailableQuantity() : 0);
        return ProductMapper.toDto(saved);
    }

    @Override
    @CacheEvict(value = "products", allEntries = true)
    public void delete(Long id) {
        Product product = productRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Product not found"));
        product.setActive(false);
        productRepository.save(product);
    }

    @Override
    public ProductDto get(Long id) {
        return productRepository.findById(id)
                .map(ProductMapper::toDto)
                .orElseThrow(() -> new ResourceNotFoundException("Product not found"));
    }

    @Override
    @Cacheable(value = "products", key = "#keyword + '-' + #pageable.pageNumber")
    public PagedResponse<ProductDto> list(String keyword, Pageable pageable) {
        Page<Product> page = productRepository.searchActiveProducts(keyword, pageable);
        return PagedResponse.<ProductDto>builder()
                .content(page.getContent().stream().map(ProductMapper::toDto).collect(Collectors.toList()))
                .totalElements(page.getTotalElements())
                .totalPages(page.getTotalPages())
                .page(page.getNumber())
                .size(page.getSize())
                .build();
    }

    @Override
    @Cacheable("featuredProducts")
    public List<ProductDto> getFeatured() {
        return productRepository.findTop12ByOrderByCreatedAtDesc().stream()
                .map(ProductMapper::toDto)
                .collect(Collectors.toList());
    }

    private void mapProduct(Product product, ProductRequest request, Category category) {
        product.setName(request.getName());
        product.setDescription(request.getDescription());
        product.setPrice(request.getPrice());
        product.setDiscount(request.getDiscount());
        product.setImageUrl(request.getImageUrl());
        product.setActive(request.isActive());
        product.setCategory(category);
    }

    private void createOrUpdateInventory(Product product, Integer quantity) {
        logger.debug("Creating or updating inventory for product ID: {} with quantity: {}", product.getId(), quantity);
        Inventory inventory = inventoryRepository.findByProduct(product).orElseGet(() -> {
            logger.debug("Creating new inventory record for product ID: {}", product.getId());
            Inventory inv = new Inventory();
            inv.setProduct(product);
            return inv;
        });
        logger.debug("Setting availableQuantity to: {} for product ID: {}", quantity != null ? quantity : 0,
                product.getId());
        inventory.setAvailableQuantity(quantity != null ? quantity : 0);
        Inventory saved = inventoryRepository.save(inventory);
        logger.debug("Inventory saved successfully. Inventory ID: {}, availableQuantity: {}", saved.getId(),
                saved.getAvailableQuantity());
    }
}
