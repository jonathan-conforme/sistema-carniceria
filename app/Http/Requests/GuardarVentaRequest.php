<?php

namespace App\Http\Requests;

use App\Models\Producto;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Validator;

class GuardarVentaRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'cliente'                  => ['nullable', 'string', 'max:120'],
            'telefono_cliente'         => ['nullable', 'string', 'max:30'],
            'metodo_pago'              => ['required', 'in:efectivo,transferencia,fiado'],
            'origen'                   => ['nullable', 'in:web,telegram'],
            'detalles'                 => ['required', 'array', 'min:1'],
            'detalles.*.producto_id'   => ['required', 'integer', 'exists:productos,id'],
            'detalles.*.peso_libras'   => ['nullable', 'numeric', 'min:0.01', 'required_without:detalles.*.monto_cobrado'],
            'detalles.*.monto_cobrado' => ['nullable', 'numeric', 'min:0.01', 'required_without:detalles.*.peso_libras'],
        ];
    }

    public function messages(): array
    {
        return [
            'detalles.required'                        => 'Agrega al menos un corte a la venta.',
            'detalles.*.peso_libras.required_without'  => 'Indica las libras de la romana o el monto en dólares.',
            'detalles.*.monto_cobrado.required_without' => 'Indica el monto en dólares o las libras de la romana.',
        ];
    }

    public function after(): array
    {
        return [
            function (Validator $validator): void {
                $datos = $validator->getData();

                if (($datos['metodo_pago'] ?? null) === 'fiado' && blank($datos['cliente'] ?? null)) {
                    $validator->errors()->add('cliente', 'Para ventas fiadas debes escribir el nombre del cliente.');
                }

                $detalles = $datos['detalles'] ?? [];
                if (!is_array($detalles) || empty($detalles)) {
                    return;
                }

                $productos = Producto::whereIn('id', collect($detalles)->pluck('producto_id')->filter())
                    ->get()
                    ->keyBy('id');

                $libras_por_producto = [];

                foreach ($detalles as $item) {
                    $producto = $productos->get($item['producto_id'] ?? 0);
                    if (!$producto) {
                        continue;
                    }

                    $peso = isset($item['peso_libras']) && $item['peso_libras'] !== ''
                        ? round((float) $item['peso_libras'], 2)
                        : round(((float) ($item['monto_cobrado'] ?? 0)) / max(0.01, (float) $producto->precio_venta_libra), 2);

                    $libras_por_producto[$producto->id] = ($libras_por_producto[$producto->id] ?? 0) + $peso;
                }

                foreach ($libras_por_producto as $producto_id => $total_libras) {
                    $producto = $productos->get($producto_id);
                    if ($producto && $total_libras > (float) $producto->stock_libras) {
                        $validator->errors()->add(
                            'detalles',
                            "Stock insuficiente de {$producto->nombre}: intentas vender {$total_libras} lb y hay {$producto->stock_libras} lb."
                        );
                    }
                }
            },
        ];
    }
}
