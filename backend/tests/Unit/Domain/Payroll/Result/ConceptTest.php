<?php

declare(strict_types=1);

use App\Domain\Payroll\Result\Category;
use App\Domain\Payroll\Result\Concept;

mutates(Concept::class);

it('asigna cada concepto a su categoría', function (Concept $concept, Category $category): void {
    expect($concept->category())->toBe($category);
})->with([
    [Concept::Salario, Category::Ingreso],
    [Concept::HoraExtra, Category::Ingreso],
    [Concept::RecargoDescanso, Category::Ingreso],
    [Concept::RecargoDiaFiesta, Category::Ingreso],
    [Concept::GastosRepresentacion, Category::Ingreso],
    [Concept::Bono, Category::Ingreso],
    [Concept::Comision, Category::Ingreso],
    [Concept::OtroIngreso, Category::Ingreso],
    [Concept::CssObrero, Category::DeduccionLey],
    [Concept::SeObrero, Category::DeduccionLey],
    [Concept::Isr, Category::DeduccionLey],
    [Concept::IsrGastosRepresentacion, Category::DeduccionLey],
    [Concept::Descuento, Category::Descuento],
    [Concept::OtroDescuento, Category::Descuento],
    [Concept::CssPatronal, Category::CargaPatronal],
    [Concept::SePatronal, Category::CargaPatronal],
    [Concept::RiesgoProfesional, Category::CargaPatronal],
]);

it('usa los valores de planilla_lineas (docs/nomix/06)', function (): void {
    expect(array_map(fn (Category $category): string => $category->value, Category::cases()))
        ->toBe(['ingreso', 'deduccion_ley', 'descuento', 'carga_patronal'])
        ->and(Concept::CssPatronal->value)->toBe('css_patronal')
        ->and(Concept::RiesgoProfesional->value)->toBe('riesgo_profesional');
});
